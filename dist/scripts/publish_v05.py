#!/usr/bin/env python3
"""Append the QEVA 0.5 mathematical correction set without rewriting history.

This publisher has three invariants:

1. all 148 QEVA 0.4 object files must still match the anchored baseline;
2. an already-existing target may be accepted only when its bytes are exact;
3. the machine replay certificate is bound to the exact subject, statement,
   theory dependencies, structured rewrite rules, and checker bytes.

The command does not regenerate indexes, pages, manifests, or release metadata.
Those replaceable projections are rebuilt later by the release pipeline.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any

from seed_release import verify_baseline


ROOT = Path(__file__).resolve().parents[1]
OBJECTS = ROOT / "archive" / "objects"
QUALIFICATIONS = ROOT / "archive" / "qualifications"
CERTIFICATES = ROOT / "certificates"
RELEASE_DATE = "2026-09-05"
REF = re.compile(r"^qeva:1:([a-z0-9][a-z0-9._-]*)@([1-9][0-9]*)$")


def canonical(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def pretty(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def digest_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def digest_path(path: Path) -> str:
    return digest_bytes(path.read_bytes())


def exact(record: dict[str, Any]) -> str:
    return f"{record['id']}@{record['revision']}"


def base_record(slug: str, revision: int) -> dict[str, Any]:
    path = OBJECTS / f"{slug}.r{revision}.json"
    if not path.is_file():
        raise SystemExit(f"missing source revision {path.relative_to(ROOT)}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if value.get("id") != f"qeva:1:{slug}" or value.get("revision") != revision:
        raise SystemExit(f"source identity mismatch in {path.relative_to(ROOT)}")
    return value


COMMON_EDITORIAL = {
    "level": "editorial",
    "method": "QEVA 0.5 protocol audit corrected scope, assumptions, and dependency semantics; no formal proof is claimed.",
    "artifact": None,
}


CORRECTIONS: dict[str, dict[str, Any]] = {
    "prime": {
        "base_revision": 2,
        "summary": "A prime is a natural number greater than one whose only positive divisors are one and itself.",
        "context": {
            "framework": "positive natural numbers with ordinary multiplication and order",
            "framework_ref": "qeva:1:natural-number@2",
            "note": "Revision 3 keeps the integer and natural-number scopes consistent and expands divisibility inside the statement.",
        },
        "assumptions": [
            {"text": "The natural-number structure and its ordinary multiplication are fixed.", "ref": "qeva:1:natural-number@2"}
        ],
        "content": {
            "plain": "A prime is greater than one and cannot be written as a product except using one or itself.",
            "exact": "Let 1:=S(0). For p∈N, Prime(p) iff p>1 and for every d∈N, if there exists k∈N with p=d·k, then d=1 or d=p.",
            "example": "7 is prime. 12 is not prime because 12=3·4 and 3 is neither 1 nor 12.",
            "caveat": "This is the positive-natural-number definition. Prime elements in general rings require units and associates to be specified.",
        },
        "dependencies": [
            "qeva:1:natural-number@2", "qeva:1:multiplication@1", "qeva:1:order@1",
            "qeva:1:existential-quantifier@1", "qeva:1:universal-quantifier@1", "qeva:1:disjunction@1"
        ],
        "relations": [],
        "reason": "Corrects the former Z-versus-positive-natural scope mismatch and makes the divisibility predicate explicit.",
    },
    "parity": {
        "base_revision": 2,
        "summary": "Integer parity defines the predicates even and odd by divisibility by two.",
        "context": {
            "framework": "integers with ordinary addition and multiplication",
            "framework_ref": "qeva:1:integer@1",
            "note": "Revision 3 separates the definitions from the distinct classification theorem that every integer has exactly one parity.",
        },
        "assumptions": [
            {"text": "The integer structure with its ordinary arithmetic is fixed.", "ref": "qeva:1:integer@1"}
        ],
        "content": {
            "plain": "An integer is even when it is twice an integer and odd when it is one more than twice an integer.",
            "exact": "For n∈Z, Even(n) iff there exists k∈Z with n=2·k; Odd(n) iff there exists k∈Z with n=2·k+1. Exhaustiveness and exclusivity are separate theorems, not part of these definitions.",
            "example": "18 is even because 18=2·9. 19 is odd because 19=2·9+1.",
            "caveat": "The theorem that every integer is exactly one of even or odd requires the division algorithm or an equivalent arithmetic argument.",
        },
        "dependencies": [
            "qeva:1:integer@1", "qeva:1:operation@2", "qeva:1:existential-quantifier@1"
        ],
        "relations": [
            {"kind": "induces", "target": "qeva:1:equivalence@2", "note": "Congruence modulo two induces the two parity classes after the classification theorem is established."}
        ],
        "reason": "Stops an unproved classification theorem from being smuggled into a definition record.",
    },
    "natural-number": {
        "base_revision": 1,
        "summary": "This orientation record describes one first-order Peano-arithmetic presentation of natural numbers.",
        "context": {
            "framework": "first-order Peano arithmetic",
            "framework_ref": "qeva:1:first-order-logic@1",
            "note": "Revision 2 selects a first-order presentation instead of conflating it with second-order categoricity.",
        },
        "assumptions": [
            {"text": "Classical first-order logic with equality is fixed.", "ref": "qeva:1:first-order-logic@1"},
            {"text": "Induction is an axiom schema over formulas in the declared arithmetic language.", "ref": "qeva:1:induction@1"},
        ],
        "content": {
            "plain": "First-order Peano arithmetic describes zero, successor, addition, multiplication, and induction through explicit axioms and schemas.",
            "exact": "One first-order presentation uses the language {0,S,+,·,=} with axioms S(x)≠0, S(x)=S(y)→x=y, recursive equations for + and ·, and for each formula φ(n,p̄) the induction instance [φ(0,p̄)∧∀n(φ(n,p̄)→φ(S(n),p̄))]→∀nφ(n,p̄).",
            "example": "0, S(0), S(S(0)), … denote the standard numerals inside every model of the theory.",
            "caveat": "First-order Peano arithmetic has nonstandard models. Categoricity of second-order Peano axioms under full semantics is a different metatheoretic statement.",
        },
        "dependencies": [
            "qeva:1:first-order-logic@1", "qeva:1:zero@1", "qeva:1:successor@1", "qeva:1:axiom@1",
            "qeva:1:induction@1", "qeva:1:addition@1", "qeva:1:multiplication@1"
        ],
        "relations": [],
        "reason": "Separates first-order arithmetic from second-order categoricity and exposes the induction dependency.",
    },
    "empty-set": {
        "base_revision": 1,
        "summary": "An empty set is a set with no members; existence and uniqueness come from the declared set theory.",
        "context": {
            "framework": "the displayed ZFC-style set-theory presentation",
            "framework_ref": "qeva:1:zfc-set-theory@1",
            "note": "Revision 2 distinguishes the defining property from the axioms used to establish existence and uniqueness.",
        },
        "assumptions": [
            {"text": "The ambient theory proves existence of a memberless set.", "ref": "qeva:1:axiom-empty-set@1"},
            {"text": "Extensionality is available to prove uniqueness.", "ref": "qeva:1:axiom-extensionality@1"},
        ],
        "content": {
            "plain": "The empty set has no members. Its existence is theory-relative, and extensionality makes it unique when it exists.",
            "exact": "Empty(E) iff E is a set and ∀x ¬(x∈E). In the declared presentation, empty-set existence gives some E with Empty(E), and extensionality proves ∀E∀F[(Empty(E)∧Empty(F))→E=F].",
            "example": "The solution set of x²=-1 over the real numbers is empty.",
            "caveat": "Some set-theory axiom lists derive existence from separation and another existence axiom instead of naming a separate empty-set axiom.",
        },
        "dependencies": [
            "qeva:1:set@1", "qeva:1:membership@1", "qeva:1:axiom-empty-set@1", "qeva:1:axiom-extensionality@1"
        ],
        "relations": [],
        "reason": "Adds the missing extensionality dependency and separates definition, existence, and uniqueness.",
    },
    "integral": {
        "base_revision": 1,
        "title": "Riemann integral",
        "summary": "The Riemann integral is the common limit approached by every sufficiently fine tagged sum.",
        "context": {
            "framework": "Riemann integration on compact real intervals",
            "framework_ref": "qeva:1:real-number@1",
            "note": "Revision 2 gives one precise Riemann formulation; other integration theories require separate formulation objects.",
        },
        "assumptions": [
            {"text": "The domain is a compact interval [a,b] in the real numbers.", "ref": "qeva:1:real-number@1"},
            {"text": "The function f:[a,b]→R is bounded.", "ref": "qeva:1:function@1"},
        ],
        "content": {
            "plain": "Cut an interval into sufficiently short pieces, sample the function in each piece, and add height times width; one stable limiting value is the Riemann integral.",
            "exact": "A bounded f:[a,b]→R is Riemann-integrable with integral I iff for every ε>0 there exists δ>0 such that every tagged partition a=x₀<⋯<xₙ=b with tᵢ∈[xᵢ₋₁,xᵢ] and mesh maxᵢ(xᵢ−xᵢ₋₁)<δ satisfies |Σᵢ f(tᵢ)(xᵢ−xᵢ₋₁)−I|<ε.",
            "example": "For f(x)=x on [0,1], the Riemann integral is 1/2.",
            "caveat": "Lebesgue, stochastic, contour, and path integrals are distinct constructions and must not be folded into this exact formulation.",
        },
        "dependencies": [
            "qeva:1:function@1", "qeva:1:limit@1", "qeva:1:real-number@1", "qeva:1:order@1"
        ],
        "relations": [],
        "reason": "Replaces a mixed Riemann/Lebesgue synopsis with one scoped exact formulation.",
    },
    "complex-number": {
        "base_revision": 1,
        "summary": "Complex numbers can be constructed as ordered pairs of reals with explicit field operations.",
        "context": {
            "framework": "ordered-pair construction over the real field",
            "framework_ref": "qeva:1:real-number@1",
            "note": "Revision 2 supplies equality, addition, multiplication, zero, one, and i rather than only multiplication.",
        },
        "assumptions": [
            {"text": "The complete ordered field of real numbers is fixed.", "ref": "qeva:1:real-number@1"}
        ],
        "content": {
            "plain": "Represent a complex number by a pair of real coordinates and define arithmetic so that the second coordinate behaves like a square root of minus one.",
            "exact": "Let C=R×R with componentwise equality, (a,b)+(c,d)=(a+c,b+d), and (a,b)·(c,d)=(ac−bd,ad+bc). Define 0_C=(0,0), 1_C=(1,0), and i=(0,1). Then i²=(-1,0), identified with the embedded real number -1.",
            "example": "3+2i corresponds to (3,2), and (0,1)·(0,1)=(-1,0).",
            "caveat": "The displayed operations define the construction; the field laws and uniqueness up to suitable isomorphism are separate theorems.",
        },
        "dependencies": ["qeva:1:real-number@1", "qeva:1:ordered-pair@1", "qeva:1:operation@2"],
        "relations": [],
        "reason": "Completes the pair construction enough to identify the operations and distinguished elements.",
    },
    "stability": {
        "base_revision": 2,
        "summary": "Lyapunov stability of a fixed point means every sufficiently small initial perturbation remains small for all future iterates.",
        "context": {
            "framework": "discrete-time metric dynamical systems",
            "framework_ref": "qeva:1:metric-space@1",
            "note": "Revision 3 makes the map and fixed-point prerequisites explicit.",
        },
        "assumptions": [
            {"text": "A metric space (X,d) is fixed.", "ref": "qeva:1:metric-space@1"},
            {"text": "A self-map F:X→X and one of its fixed points x* are fixed.", "ref": "qeva:1:fixed-point@2"},
        ],
        "content": {
            "plain": "A fixed point is Lyapunov-stable when starting close enough guarantees staying as close as requested forever.",
            "exact": "Let (X,d) be a metric space, F:X→X, and F(x*)=x*. The fixed point x* is Lyapunov-stable iff for every ε>0 there exists δ>0 such that d(x₀,x*)<δ implies d(Fⁿ(x₀),x*)<ε for every n∈N.",
            "example": "For F(x)=x/2 on R, the fixed point 0 is Lyapunov-stable and attracting.",
            "caveat": "Lyapunov, asymptotic, orbital, structural, input-output, and stochastic stability are inequivalent notions requiring separate formulations.",
        },
        "dependencies": [
            "qeva:1:metric-space@1", "qeva:1:function@1", "qeva:1:fixed-point@2", "qeva:1:recurrence@2",
            "qeva:1:universal-quantifier@1", "qeva:1:existential-quantifier@1"
        ],
        "relations": [
            {"kind": "classifies", "target": "qeva:1:fixed-point@2", "note": "This revision defines one stability predicate for fixed points."},
            {"kind": "related-to", "target": "qeva:1:attractor@2", "note": "Attraction and Lyapunov stability are distinct properties."},
            {"kind": "contrasts-with", "target": "qeva:1:sensitivity@2", "note": "They quantify perturbation behavior differently and are not simple logical negations."},
        ],
        "reason": "Adds the previously omitted fixed-point and function dependencies and fixes the dynamical scope.",
    },
    "information": {
        "base_revision": 1,
        "title": "Self-information",
        "summary": "Self-information assigns a logarithmic surprise to an event of positive probability.",
        "context": {
            "framework": "discrete probability and information theory",
            "framework_ref": "qeva:1:probability-space@1",
            "note": "Revision 2 narrows the broad title and supplies the missing logarithm-base condition.",
        },
        "assumptions": [
            {"text": "A probability space and an event E of positive probability are fixed.", "ref": "qeva:1:probability-space@1"}
        ],
        "content": {
            "plain": "Within a probability model, a less probable event carries more self-information when surprise is measured logarithmically.",
            "exact": "For an event E with 0<P(E)≤1 and a real base b>1, its self-information is I_b(E):=−log_b(P(E)). The unit is the bit when b=2 and the nat when b=e.",
            "example": "Either result of a fair coin toss has self-information 1 bit.",
            "caveat": "Self-information is model-relative and is not identical to meaning, knowledge, usefulness, evidence, or truth.",
        },
        "dependencies": ["qeva:1:probability-space@1", "qeva:1:real-number@1", "qeva:1:order@1"],
        "relations": [],
        "reason": "Adds b>1 and disambiguates self-information from the much broader word information.",
    },
    "optimization": {
        "base_revision": 2,
        "summary": "A minimization problem specifies a feasible set and objective; its infimum is the optimal value and may be unattained.",
        "context": {
            "framework": "ordered optimization",
            "framework_ref": "qeva:1:order@1",
            "note": "Revision 3 distinguishes the optimization problem, its optimal value, and a minimizer.",
        },
        "assumptions": [
            {"text": "A nonempty feasible set X and an objective f:X→Y are fixed.", "ref": "qeva:1:function@1"},
            {"text": "The codomain Y has enough order structure for the displayed comparisons and infimum.", "ref": "qeva:1:order@1"},
        ],
        "content": {
            "plain": "Optimization first specifies which choices are allowed and how they are scored; the best lower score may or may not be achieved by a choice.",
            "exact": "A minimization problem is specified by a feasible set X and objective f:X→Y into an ordered codomain. When it exists, inf f(X) is the optimal value. A global minimizer is x*∈X satisfying f(x*)≤f(x) for every x∈X; a finite infimum need not be attained.",
            "example": "For f(x)=(x−3)² on R, the optimal value is 0 and the unique global minimizer is x=3.",
            "caveat": "Mathematical optimality is relative to the chosen feasible set, objective, and order; it does not certify that those choices are appropriate.",
        },
        "dependencies": ["qeva:1:function@1", "qeva:1:order@1", "qeva:1:universal-quantifier@1"],
        "relations": [
            {"kind": "distinguishes", "target": "qeva:1:local-global@2", "note": "Local and global minimizers quantify over different neighborhoods."},
            {"kind": "paired-with", "target": "qeva:1:exploration-exploitation@2", "note": "Search procedures may trade current objective value against information gathering."},
        ],
        "reason": "Corrects the former identification of a minimization problem with its infimum.",
    },
    "operation": {
        "base_revision": 1,
        "summary": "An operation is a typed map from declared input sorts to a declared output sort.",
        "context": {
            "framework": "typed structural mathematics",
            "framework_ref": "qeva:1:function@1",
            "note": "Revision 2 admits heterogeneous and external operations while retaining internal n-ary operations as a special case.",
        },
        "assumptions": [
            {"text": "Every input and output sort is declared.", "ref": "qeva:1:function@1"}
        ],
        "content": {
            "plain": "An operation takes inputs of declared kinds and returns an output of a declared kind; not every useful operation is closed on one set.",
            "exact": "An n-ary typed operation is a function ω:X₁×⋯×Xₙ→Y. It is internal on X when X₁=⋯=Xₙ=Y=X. An external operation, such as scalar multiplication F×V→V, may have different input and output sorts.",
            "example": "Integer addition Z×Z→Z is internal; scalar multiplication F×V→V is heterogeneous.",
            "caveat": "Partial, relational, multivalued, stochastic, and higher operations require additional structure beyond this total-function formulation.",
        },
        "dependencies": ["qeva:1:function@1", "qeva:1:ordered-pair@1"],
        "relations": [],
        "reason": "Repairs the single-sorted definition that could not support scalar actions used elsewhere in the graph.",
    },
    "one-plus-one": {
        "base_revision": 1,
        "summary": "In the declared Peano rewrite kernel, the closed term adding one to one normalizes to two.",
        "context": {
            "framework": "QEVA Peano Rewrite Kernel 1",
            "framework_ref": "qeva:1:natural-number@2",
            "note": "Revision 2 binds its exact statement and structured derivation to a deterministic certificate and pinned dependencies.",
        },
        "assumptions": [
            {"text": "The two recursive addition equations are used as oriented rewrite rules.", "ref": "qeva:1:addition@1"},
            {"text": "The symbols 0 and S belong to the declared natural-number presentation.", "ref": "qeva:1:natural-number@2"},
        ],
        "content": {
            "plain": "The kernel expands addition once, then removes addition by zero, leaving exactly the term used to define two.",
            "exact": "With 1:=S(0), 2:=S(S(0)), add(a,0)→a, and add(a,S(b))→S(add(a,b)), the closed term add(1,1) normalizes by two certified rewrites to 2.",
            "example": "add(S(0),S(0)) → S(add(S(0),0)) → S(S(0)).",
            "caveat": "This establishes syntactic normalization in the declared rewrite kernel. It does not by itself prove soundness of a broader arithmetic theory.",
        },
        "dependencies": ["qeva:1:addition@1", "qeva:1:natural-number@2", "qeva:1:proof@1"],
        "relations": [],
        "verification": {
            "level": "machine-checked",
            "method": "Structured rewrite replay bound to the exact subject, exact statement, dependency digests, kernel rules, and checker bytes.",
            "artifact": "certificates/peano-kernel-0/one-plus-one.r2.json",
        },
        "reason": "Supersedes the demonstration whose certificate was not cryptographically or semantically bound to its subject.",
    },
}


def corrected_record(slug: str, spec: dict[str, Any]) -> dict[str, Any]:
    base_revision = spec["base_revision"]
    record = copy.deepcopy(base_record(slug, base_revision))
    record["revision"] = base_revision + 1
    record["supersedes"] = f"qeva:1:{slug}@{base_revision}"
    for key in ("title", "summary", "context", "assumptions", "content", "dependencies", "relations"):
        if key in spec:
            record[key] = copy.deepcopy(spec[key])
    record["verification"] = copy.deepcopy(spec.get("verification", COMMON_EDITORIAL))
    record["provenance"] = {
        "created": RELEASE_DATE,
        "creator": "QEVA 0.5 mathematical protocol audit",
        "license": "CC0-1.0",
        "source_note": spec["reason"] + " This is an original QEVA formulation and remains subject to independent review.",
    }
    return record


def all_existing_records() -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    for path in sorted(OBJECTS.glob("*.json")):
        item = json.loads(path.read_text(encoding="utf-8"))
        ref = exact(item)
        if ref in records:
            raise SystemExit(f"duplicate exact record {ref}")
        records[ref] = item
    return records


def get_at(term: Any, path: list[int]) -> Any:
    value = term
    for index in path:
        if not isinstance(index, int) or index < 0 or not isinstance(value, list) or index >= len(value):
            raise ValueError(f"invalid term path {path}")
        value = value[index]
    return value


def replace_at(term: Any, path: list[int], replacement: Any) -> Any:
    if not path:
        return copy.deepcopy(replacement)
    result = copy.deepcopy(term)
    parent = result
    for index in path[:-1]:
        parent = parent[index]
    parent[path[-1]] = copy.deepcopy(replacement)
    return result


def match(pattern: Any, term: Any, environment: dict[str, Any]) -> bool:
    if isinstance(pattern, str) and pattern.startswith("?"):
        if pattern in environment:
            return environment[pattern] == term
        environment[pattern] = copy.deepcopy(term)
        return True
    if isinstance(pattern, list):
        return isinstance(term, list) and len(pattern) == len(term) and all(match(p, t, environment) for p, t in zip(pattern, term))
    return pattern == term


def instantiate(template: Any, environment: dict[str, Any]) -> Any:
    if isinstance(template, str) and template.startswith("?"):
        if template not in environment:
            raise ValueError(f"unbound metavariable {template}")
        return copy.deepcopy(environment[template])
    if isinstance(template, list):
        return [instantiate(value, environment) for value in template]
    return copy.deepcopy(template)


def replay(certificate: dict[str, Any]) -> Any:
    rules = {rule["id"]: rule for rule in certificate["kernel"]["rules"]}
    term = copy.deepcopy(certificate["claim"]["lhs"])
    for number, step in enumerate(certificate["derivation"], 1):
        if term != step["before"]:
            raise ValueError(f"step {number}: before-term does not equal current term")
        if step["rule"] not in rules:
            raise ValueError(f"step {number}: unknown rule {step['rule']}")
        environment: dict[str, Any] = {}
        target = get_at(term, step["path"])
        rule = rules[step["rule"]]
        if not match(rule["pattern"], target, environment):
            raise ValueError(f"step {number}: rule does not match target")
        result = replace_at(term, step["path"], instantiate(rule["replacement"], environment))
        if result != step["after"]:
            raise ValueError(f"step {number}: declared after-term is incorrect")
        term = result
    if term != certificate["claim"]["rhs"]:
        raise ValueError("derivation result does not equal the claimed normal form")
    return term


def binding(ref: str, records: dict[str, dict[str, Any]], role: str) -> dict[str, str]:
    if ref not in records:
        raise SystemExit(f"missing proof dependency {ref}")
    return {"ref": ref, "role": role, "canonical_sha256": digest_bytes(canonical(records[ref]))}


def certificate_for(subject: dict[str, Any], records: dict[str, dict[str, Any]]) -> dict[str, Any]:
    statement = subject["content"]["exact"]
    return {
        "certificate_version": "0.2",
        "id": "qeva-certificate:1:one-plus-one:peano-rewrite-1",
        "subject_ref": exact(subject),
        "subject_canonical_sha256": digest_bytes(canonical(subject)),
        "subject_statement": statement,
        "subject_statement_sha256": digest_bytes(statement.encode("utf-8")),
        "claim": {
            "relation": "normalizes-to",
            "lhs": ["add", ["S", "0"], ["S", "0"]],
            "rhs": ["S", ["S", "0"]],
        },
        "dependency_bindings": [
            binding("qeva:1:addition@1", records, "rewrite-definition"),
            binding("qeva:1:natural-number@2", records, "theory-context"),
            binding("qeva:1:zero@1", records, "constant"),
            binding("qeva:1:successor@1", records, "constructor"),
            binding("qeva:1:proof@1", records, "proof-concept"),
        ],
        "kernel": {
            "id": "QEVA-Peano-Rewrite-Kernel",
            "version": "1",
            "term_encoding": "JSON arrays; operator at index 0; metavariables are strings beginning with ?",
            "rules": [
                {"id": "add-zero", "pattern": ["add", "?a", "0"], "replacement": "?a"},
                {"id": "add-successor", "pattern": ["add", "?a", ["S", "?b"]], "replacement": ["S", ["add", "?a", "?b"]]},
            ],
        },
        "derivation": [
            {
                "rule": "add-successor", "path": [],
                "before": ["add", ["S", "0"], ["S", "0"]],
                "after": ["S", ["add", ["S", "0"], "0"]],
            },
            {
                "rule": "add-zero", "path": [1],
                "before": ["S", ["add", ["S", "0"], "0"]],
                "after": ["S", ["S", "0"]],
            },
        ],
        "result": {"outcome": "pass", "normal_form": ["S", ["S", "0"]]},
        "created": RELEASE_DATE,
    }


def validate_certificate(certificate: dict[str, Any], subject: dict[str, Any], records: dict[str, dict[str, Any]]) -> None:
    if certificate["subject_ref"] != exact(subject):
        raise SystemExit("certificate subject reference mismatch")
    if certificate["subject_canonical_sha256"] != digest_bytes(canonical(subject)):
        raise SystemExit("certificate subject digest mismatch")
    statement = subject["content"]["exact"]
    if certificate["subject_statement"] != statement:
        raise SystemExit("certificate statement text mismatch")
    if certificate["subject_statement_sha256"] != digest_bytes(statement.encode("utf-8")):
        raise SystemExit("certificate statement digest mismatch")
    for item in certificate["dependency_bindings"]:
        if item["ref"] not in records or item["canonical_sha256"] != digest_bytes(canonical(records[item["ref"]])):
            raise SystemExit(f"certificate dependency binding mismatch: {item['ref']}")
    try:
        result = replay(certificate)
    except ValueError as exc:
        raise SystemExit(f"certificate replay failed: {exc}") from exc
    if result != certificate["result"]["normal_form"] or certificate["result"]["outcome"] != "pass":
        raise SystemExit("certificate recorded result mismatch")


def qualification_for(subject: dict[str, Any], certificate_path: str, certificate_bytes: bytes) -> dict[str, Any]:
    statement = subject["content"]["exact"]
    checker_relative = "scripts/publish_v05.py"
    checker_path = ROOT / checker_relative
    return {
        "qualification_version": "0.2",
        "id": "qeva-qualification:1:one-plus-one:peano-rewrite-1",
        "revision": 1,
        "subject": exact(subject),
        "subject_sha256": digest_bytes(canonical(subject)),
        "dimension": "machine-replay",
        "outcome": "pass",
        "scope": {
            "field": "content.exact",
            "statement_sha256": digest_bytes(statement.encode("utf-8")),
            "claim_relation": "normalizes-to",
        },
        "method": "Replay every structured rewrite step, verify the resulting normal form, and bind the subject, statement, dependencies, rules, artifact, and checker by SHA-256.",
        "artifact": certificate_path,
        "artifact_sha256": digest_bytes(certificate_bytes),
        "asserted_by": "QEVA reference checker 0.5",
        "asserted": RELEASE_DATE,
        "environment": {
            "checker": checker_relative,
            "checker_sha256": digest_path(checker_path),
            "kernel": "QEVA-Peano-Rewrite-Kernel@1",
            "language": "Python 3 standard-library semantics",
            "network_required": False,
        },
        "supersedes": None,
    }


def safe_target(relative: str) -> Path:
    path = (ROOT / relative).resolve()
    try:
        path.relative_to(ROOT.resolve())
    except ValueError as exc:
        raise SystemExit(f"target escapes release root: {relative}") from exc
    return path


def preflight(payloads: dict[str, bytes], check_only: bool) -> None:
    mismatches: list[str] = []
    missing: list[str] = []
    for relative, expected in sorted(payloads.items()):
        path = safe_target(relative)
        if not path.exists():
            missing.append(relative)
        elif not path.is_file() or path.read_bytes() != expected:
            mismatches.append(relative)
    if mismatches:
        raise SystemExit("append-only refusal; existing targets have different bytes:\n- " + "\n- ".join(mismatches))
    if check_only and missing:
        raise SystemExit("0.5 publication is incomplete:\n- " + "\n- ".join(missing))


def append_payloads(payloads: dict[str, bytes]) -> int:
    written = 0
    for relative, data in sorted(payloads.items()):
        path = safe_target(relative)
        if path.exists():
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        try:
            with path.open("xb") as handle:
                handle.write(data)
        except FileExistsError:
            if path.read_bytes() != data:
                raise SystemExit(f"concurrent append conflict: {relative}")
        written += 1
    return written


def build_payloads() -> tuple[dict[str, bytes], dict[str, Any]]:
    proposed = {slug: corrected_record(slug, spec) for slug, spec in CORRECTIONS.items()}
    existing = all_existing_records()
    records = dict(existing)
    for record in proposed.values():
        records[exact(record)] = record
    for record in proposed.values():
        for dependency in record["dependencies"]:
            if dependency not in records:
                raise SystemExit(f"{exact(record)} has missing dependency {dependency}")

    subject = proposed["one-plus-one"]
    certificate = certificate_for(subject, records)
    validate_certificate(certificate, subject, records)
    certificate_relative = "certificates/peano-kernel-0/one-plus-one.r2.json"
    certificate_bytes = pretty(certificate)
    qualification = qualification_for(subject, certificate_relative, certificate_bytes)

    payloads: dict[str, bytes] = {}
    for slug, record in proposed.items():
        payloads[f"archive/objects/{slug}.r{record['revision']}.json"] = pretty(record)
    payloads[certificate_relative] = certificate_bytes
    payloads["archive/qualifications/one-plus-one.peano-rewrite-1.r1.json"] = pretty(qualification)
    return payloads, certificate


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify that every 0.5 payload already exists byte-for-byte")
    args = parser.parse_args()

    baseline_count = verify_baseline()
    payloads, certificate = build_payloads()
    preflight(payloads, args.check)
    written = 0 if args.check else append_payloads(payloads)
    preflight(payloads, True)
    verify_baseline()
    subject = json.loads(payloads["archive/objects/one-plus-one.r2.json"])
    records = all_existing_records()
    validate_certificate(certificate, subject, records)

    action = "verified" if args.check else f"appended {written}; verified"
    print(f"v0.5 publisher: immutable baseline {baseline_count}/148 PASS")
    print(f"v0.5 publisher: {action} {len(CORRECTIONS)} revisions, 1 certificate, 1 qualification")
    print("v0.5 publisher: subject · statement · dependency · rule · artifact · checker binding PASS")


if __name__ == "__main__":
    main()
