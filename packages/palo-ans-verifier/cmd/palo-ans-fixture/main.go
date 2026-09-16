// Synthetic fixture issuer, deliberately a separate binary from the verifier.
// All keys are ephemeral. These artifacts are NOT GoDaddy registrations.
package main

import (
	"bufio"
	"context"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"math/big"
	"net/url"
	"os"
	"time"

	"github.com/agentnameservice/ans-sdk-go/pop"
	"github.com/agentnameservice/ans-sdk-go/verify/scitt"
	"github.com/fxamacker/cbor/v2"
)

const name = "ans://v1.0.0.refund.example.test"
const agentID = "00000000-0000-4000-8000-000000000001"
const issuer = "palo-synthetic-demo.test"

func must[T any](v T, err error) T {
	if err != nil {
		panic(err)
	}
	return v
}
func encode(v any) []byte    { return must(cbor.Marshal(v)) }
func key() *ecdsa.PrivateKey { return must(ecdsa.GenerateKey(elliptic.P256(), rand.Reader)) }
func keyID(k *ecdsa.PrivateKey) []byte {
	h := sha256.Sum256(must(x509.MarshalPKIXPublicKey(&k.PublicKey)))
	return h[:4]
}
func cert(k *ecdsa.PrivateKey) []byte {
	u := must(url.Parse(name))
	now := time.Now()
	t := &x509.Certificate{SerialNumber: big.NewInt(1), Subject: pkix.Name{CommonName: "PALO synthetic fixture"}, NotBefore: now.Add(-time.Hour), NotAfter: now.Add(time.Hour), KeyUsage: x509.KeyUsageDigitalSignature, ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageClientAuth}, URIs: []*url.URL{u}}
	return must(x509.CreateCertificate(rand.Reader, t, t, &k.PublicKey, k))
}
func cose(k *ecdsa.PrivateKey, payload []byte, receipt bool) []byte {
	h := map[int64]any{1: int64(-7), 4: keyID(k), 15: map[int64]any{1: issuer}}
	u := map[int64]any{}
	if receipt {
		h[395] = int64(1)
		u[396] = map[int64]any{-1: uint64(1), -2: uint64(0)}
	}
	p := encode(h)
	digest := must(scitt.ComputeSigStructureDigest(p, payload))
	r, s, err := ecdsa.Sign(rand.Reader, k, digest[:])
	if err != nil {
		panic(err)
	}
	sig := make([]byte, 64)
	r.FillBytes(sig[:32])
	s.FillBytes(sig[32:])
	return encode(cbor.Tag{Number: 18, Content: []any{p, u, payload, sig}})
}
func main() {
	tl, agent, attacker := key(), key(), key()
	der := cert(agent)
	fingerprint := sha256.Sum256(der)
	signer := must(pop.NewSigner(agent, der))
	attackerSigner := must(pop.NewSigner(attacker, cert(attacker)))
	spki := must(x509.MarshalPKIXPublicKey(&tl.PublicKey))
	root := issuer + "+" + hex.EncodeToString(keyID(tl)) + "+" + base64.StdEncoding.EncodeToString(spki)
	scan := bufio.NewScanner(os.Stdin)
	scan.Buffer(make([]byte, 4096), 512*1024)
	out := json.NewEncoder(os.Stdout)
	for scan.Scan() {
		var q struct {
			ID       string `json:"id"`
			Op       string `json:"op"`
			Content  []byte `json:"content"`
			Audience string `json:"audience"`
			Variant  string `json:"variant"`
		}
		if err := json.Unmarshal(scan.Bytes(), &q); err != nil {
			panic(err)
		}
		if q.Op == "init" {
			out.Encode(map[string]any{"id": q.ID, "roots": []string{root}, "ansName": name, "ansId": agentID, "fingerprint": "sha256:" + hex.EncodeToString(fingerprint[:]), "jkt": signer.JKT()})
			continue
		}
		now := time.Now().Unix()
		iat, exp, status := now-1, now+120, "ACTIVE"
		switch q.Variant {
		case "revoked":
			status = "REVOKED"
		case "warning":
			status = "WARNING"
		case "expired":
			iat = now - 600
			exp = now - 1
		case "stale":
			iat = now - 400
			exp = now + 120
		case "future":
			iat = now + 30
			exp = now + 120
		}
		statusBytes := cose(tl, encode(map[int64]any{1: agentID, 2: status, 3: iat, 4: exp, 5: name, 6: []any{map[string]any{"fingerprint": fingerprint[:], "cert_type": "x509-ov-client"}}}), false)
		leaf := must(json.Marshal(map[string]any{"schemaVersion": "V2", "payload": map[string]any{"producer": map[string]any{"event": map[string]any{"ansId": agentID, "ansName": name}}}}))
		receipt := cose(tl, leaf, true)
		s := signer
		if q.Variant == "copied-identity" {
			s = attackerSigner
		}
		proof := must(s.Sign(context.Background(), "POST", q.Audience, pop.WithContent(q.Content)))
		if q.Variant == "tampered-receipt" {
			receipt[len(receipt)-1] ^= 1
		}
		if q.Variant == "missing-receipt" {
			receipt = nil
		}
		if err := out.Encode(map[string]any{"id": q.ID, "proof": proof, "receipt": receipt, "statusToken": statusBytes}); err != nil {
			panic(err)
		}
	}
	if err := scan.Err(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
