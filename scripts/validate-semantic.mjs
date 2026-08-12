import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { DataFactory, Parser, Store } from "n3";

const { namedNode } = DataFactory;
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const NS = {
  rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
  rdfs: "http://www.w3.org/2000/01/rdf-schema#",
  owl: "http://www.w3.org/2002/07/owl#",
  sh: "http://www.w3.org/ns/shacl#",
  xsd: "http://www.w3.org/2001/XMLSchema#",
  palo: "https://paloframework.org/semantic/",
};

const loadStore = async (file) => new Store(new Parser({ format: "text/turtle", baseIRI: NS.palo }).parse(await readFile(path.join(projectRoot, file), "utf8")));
const objects = (store, subject, predicate) => store.getObjects(subject, namedNode(predicate), null);
const subjects = (store, predicate, object) => store.getSubjects(namedNode(predicate), object, null);
const termKey = (term) => `${term.termType}:${term.value}`;

const ontology = await loadStore("formal/palo-ontology-v3.ttl");
const shapes = await loadStore("formal/palo-ontology-v3.shacl.ttl");
const validData = await loadStore("schemas/fixtures/palo-semantic-records.valid.ttl");
const invalidData = await loadStore("schemas/fixtures/palo-semantic-records.invalid.ttl");
const invariants = JSON.parse(await readFile(path.join(projectRoot, "data/semantic-invariants.json"), "utf8"));
const context = JSON.parse(await readFile(path.join(projectRoot, "data/palo-semantic-context.jsonld"), "utf8"));

const requiredClasses = ["SemanticEntity", "CanonicalDefinition", "RuntimeRecord", "ImmutableRecord", "LifecycleDefinition", "GateInstance", "GateDecisionRecord", "EvidenceArtifact", "EvidenceClaim", "EvidenceEvaluation", "EvidenceBundleManifest", "MappingRecord", "SemanticReleaseManifest"];
for (const name of requiredClasses) {
  if (!ontology.countQuads(namedNode(`${NS.palo}${name}`), namedNode(`${NS.rdf}type`), namedNode(`${NS.owl}Class`), null)) throw new Error(`Ontology is missing required class ${name}`);
}
if (context["@context"]?.palo !== NS.palo) throw new Error("JSON-LD context must use the public PALO semantic namespace.");
const invariantIds = invariants.invariants.map((item) => item.invariantId);
if (new Set(invariantIds).size !== invariantIds.length || invariantIds.length < 14) throw new Error("Semantic invariant registry is incomplete or contains duplicate IDs.");

const ancestors = (store, type, memo = new Set()) => {
  const key = termKey(type);
  if (memo.has(key)) return memo;
  memo.add(key);
  for (const parent of objects(store, type, `${NS.rdfs}subClassOf`)) ancestors(store, parent, memo);
  return memo;
};
const instanceOf = (data, node, targetClass) => objects(data, node, `${NS.rdf}type`).some((type) => ancestors(ontology, type).has(termKey(targetClass)));
const listValues = (store, head) => {
  const values = [];
  const seen = new Set();
  let current = head;
  while (current && current.value !== `${NS.rdf}nil` && !seen.has(termKey(current))) {
    seen.add(termKey(current));
    const first = objects(store, current, `${NS.rdf}first`)[0];
    if (!first) break;
    values.push(first.value);
    current = objects(store, current, `${NS.rdf}rest`)[0];
  }
  return values;
};
const isDatatype = (term, datatype) => {
  if (term.termType !== "Literal") return false;
  if (term.datatype.value !== datatype.value) return false;
  if (datatype.value === `${NS.xsd}dateTime`) return !Number.isNaN(Date.parse(term.value));
  if (datatype.value === `${NS.xsd}integer`) return /^-?\d+$/.test(term.value);
  if (datatype.value === `${NS.xsd}boolean`) return /^(true|false|1|0)$/.test(term.value);
  return true;
};

function validateShacl(data) {
  const violations = [];
  const shapeNodes = subjects(shapes, `${NS.rdf}type`, namedNode(`${NS.sh}NodeShape`));
  for (const shape of shapeNodes) {
    const target = objects(shapes, shape, `${NS.sh}targetClass`)[0];
    if (!target) continue;
    const focusNodes = new Map();
    for (const type of subjects(data, `${NS.rdf}type`, null)) if (instanceOf(data, type, target)) focusNodes.set(termKey(type), type);
    for (const focus of focusNodes.values()) {
      for (const propertyShape of objects(shapes, shape, `${NS.sh}property`)) {
        const predicate = objects(shapes, propertyShape, `${NS.sh}path`)[0];
        if (!predicate) continue;
        const values = objects(data, focus, predicate.value);
        const min = Number(objects(shapes, propertyShape, `${NS.sh}minCount`)[0]?.value ?? 0);
        const maxTerm = objects(shapes, propertyShape, `${NS.sh}maxCount`)[0];
        const max = maxTerm ? Number(maxTerm.value) : Infinity;
        const datatype = objects(shapes, propertyShape, `${NS.sh}datatype`)[0];
        const classTerm = objects(shapes, propertyShape, `${NS.sh}class`)[0];
        const minLength = Number(objects(shapes, propertyShape, `${NS.sh}minLength`)[0]?.value ?? 0);
        const pattern = objects(shapes, propertyShape, `${NS.sh}pattern`)[0]?.value;
        const allowedHead = objects(shapes, propertyShape, `${NS.sh}in`)[0];
        const allowed = allowedHead ? listValues(shapes, allowedHead) : null;
        const hasValue = objects(shapes, propertyShape, `${NS.sh}hasValue`)[0];
        if (values.length < min || values.length > max) violations.push(`${focus.value} ${predicate.value} cardinality ${values.length}, expected ${min}..${max}`);
        for (const value of values) {
          if (datatype && !isDatatype(value, datatype)) violations.push(`${focus.value} ${predicate.value} has invalid datatype or lexical value`);
          if (classTerm && !instanceOf(data, value, classTerm)) violations.push(`${focus.value} ${predicate.value} must reference ${classTerm.value}`);
          if (minLength && value.value.length < minLength) violations.push(`${focus.value} ${predicate.value} is shorter than ${minLength}`);
          if (pattern && !new RegExp(pattern).test(value.value)) violations.push(`${focus.value} ${predicate.value} does not match ${pattern}`);
          if (allowed && !allowed.includes(value.value)) violations.push(`${focus.value} ${predicate.value} is outside the allowed vocabulary`);
        }
        if (hasValue && !values.some((value) => value.equals(hasValue))) violations.push(`${focus.value} ${predicate.value} must include ${hasValue.value}`);
      }
    }
  }
  return violations;
}

const validViolations = validateShacl(validData);
if (validViolations.length) throw new Error(`Valid semantic fixture failed:\n${validViolations.join("\n")}`);
const invalidViolations = validateShacl(invalidData);
if (!invalidViolations.length) throw new Error("Invalid semantic fixture unexpectedly passed SHACL validation.");
console.log(`Semantic validation passed: ${ontology.size} ontology triples, ${shapes.size} SHACL triples, ${requiredClasses.length} required classes, ${invariantIds.length} invariants; invalid fixture produced ${invalidViolations.length} expected violations.`);
