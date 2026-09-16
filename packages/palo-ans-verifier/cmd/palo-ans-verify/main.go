// Command palo-ans-verify verifies ANS Method-B presentations offline using the
// upstream SDK. Trust roots are operator-owned files, never request input.
package main

import (
	"bufio"
	"context"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/agentnameservice/ans-sdk-go/pop"
	"github.com/agentnameservice/ans-sdk-go/verify/scitt"
)

type request struct {
	ID              string `json:"id"`
	Proof           string `json:"proof"`
	Receipt         []byte `json:"receipt"`
	StatusToken     []byte `json:"statusToken"`
	Content         []byte `json:"content"`
	ExpectedAnsName string `json:"expectedAnsName"`
}

func run() error {
	rootsPath := flag.String("roots", "", "operator-controlled JSON array of C2SP public root keys")
	audience := flag.String("audience", "", "exact HTTPS execution URL; not taken from the presentation")
	maxAge := flag.Int64("max-status-age", 300, "maximum accepted status age in seconds")
	flag.Parse()
	if *rootsPath == "" || *audience == "" || *maxAge < 1 || *maxAge > 3600 {
		return errors.New("roots, audience and bounded max-status-age are required")
	}
	u, err := url.Parse(*audience)
	if err != nil || u.Scheme != "https" || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return errors.New("audience must be an exact HTTPS URL without credentials, query or fragment")
	}
	raw, err := os.ReadFile(*rootsPath)
	if err != nil {
		return err
	}
	var roots []string
	if err = json.Unmarshal(raw, &roots); err != nil {
		return err
	}
	if len(roots) == 0 {
		return errors.New("empty trust roots")
	}
	keys, err := scitt.NewKeyStore(roots)
	if err != nil {
		return err
	}
	replay := pop.NewMemoryReplayCache(context.Background(), 10000)
	defer replay.Close()
	scanner := bufio.NewScanner(os.Stdin)
	scanner.Buffer(make([]byte, 4096), 512*1024)
	out := json.NewEncoder(os.Stdout)
	for scanner.Scan() {
		var req request
		if err = json.Unmarshal(scanner.Bytes(), &req); err != nil {
			return errors.New("invalid request JSON")
		}
		result := map[string]any{"id": req.ID, "valid": false}
		identity, expiry, checkErr := check(req, *audience, *maxAge, keys, replay)
		if checkErr != nil {
			result["reason"] = checkErr.Error()
		} else {
			result["valid"] = true
			result["ansName"] = identity.AnsName
			result["ansId"] = identity.AgentID
			result["fingerprint"] = "sha256:" + identity.FingerprintHex()
			result["jkt"] = identity.JKT
			result["expiresAt"] = expiry.UTC().Format(time.RFC3339)
			result["profile"] = "ans-method-b-signed-leaf-status-dpop"
			// The SDK verifies the signed leaf; its walked Merkle root is not
			// compared to an independently authenticated checkpoint by this bridge.
			result["checkpointVerified"] = false
		}
		if err = out.Encode(result); err != nil {
			return err
		}
	}
	return scanner.Err()
}

func check(req request, audience string, maxAge int64, keys scitt.KeyLookup, replay pop.ReplayCache) (*pop.CallerIdentity, time.Time, error) {
	now := time.Now().Unix()
	st, err := scitt.VerifyStatusTokenAt(req.StatusToken, keys, 0, now)
	if err != nil {
		return nil, time.Time{}, err
	}
	// Apply a stricter local policy than the SDK's connection-valid states and
	// default skew. WARNING/DEPRECATED require explicit review, not an allow.
	if st.Payload.Status != scitt.StatusActive || st.Payload.Iat > now || st.Payload.Exp <= now || st.Payload.Exp <= st.Payload.Iat || now-st.Payload.Iat >= maxAge {
		return nil, time.Time{}, errors.New("ANS status must be ACTIVE, current and within the local freshness window")
	}
	id, err := pop.VerifyCaller(context.Background(), req.Proof,
		&scitt.Headers{Receipt: req.Receipt, StatusToken: req.StatusToken}, "POST", audience, keys, replay,
		pop.WithExpectedAnsName(req.ExpectedAnsName), pop.WithPoPSkew(60*time.Second),
		pop.WithVerifyOptions(pop.WithReceivedContent(func() ([]byte, error) { return req.Content, nil })))
	if err != nil {
		return nil, time.Time{}, err
	}
	// Read validity limits only AFTER the SDK authenticates these exact bytes.
	parts := strings.Split(req.Proof, ".")
	var payload struct {
		Iat int64 `json:"iat"`
	}
	var header struct {
		X5c []string `json:"x5c"`
	}
	payloadBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, time.Time{}, err
	}
	if err = json.Unmarshal(payloadBytes, &payload); err != nil {
		return nil, time.Time{}, err
	}
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, time.Time{}, err
	}
	if err = json.Unmarshal(headerBytes, &header); err != nil || len(header.X5c) != 1 {
		return nil, time.Time{}, errors.New("invalid verified certificate header")
	}
	der, err := base64.StdEncoding.DecodeString(header.X5c[0])
	if err != nil {
		return nil, time.Time{}, err
	}
	cert, err := x509.ParseCertificate(der)
	if err != nil {
		return nil, time.Time{}, err
	}
	expiry := min(st.Payload.Exp, st.Payload.Iat+maxAge, payload.Iat+60, cert.NotAfter.Unix())
	if expiry <= now {
		return nil, time.Time{}, errors.New("verified proof validity window ended")
	}
	return id, time.Unix(expiry, 0), nil
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
