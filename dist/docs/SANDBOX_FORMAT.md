# Portable sandbox format 1

A sandbox can reveal behavior. It cannot silently upgrade behavior into truth.

## Contract

A `qeva-sandbox/1` document carries an opaque `lab:` ID, local revision, title, exact kernel reference, current parameters, exact archive concept references, a claim declaration, provenance and a preserved run journal. `protocol/sandbox.schema.json` specifies structure; `protocol/SANDBOX_CORE.txt` specifies arithmetic. Four complete specimens are in `sandbox/examples/`, including an inconclusive budget stop.

Claim labels: experiment, observation, conjecture, theorem, proof, counterexample. These are **user declarations** and `claim.verification` must remain `unreviewed`. A label is not a proof, peer review, theorem admission or trusted identity. The creator label is self-described. Fork provenance names the source lab ID/revision; it is not a cryptographic chain or an authenticated claim of ownership.

Each run freezes its own exact kernel, parameters, arithmetic label, states, summary, stopping status, timestamp and note. Changing the editor parameters or selected kernel does not change a previous run. Reproduce uses the recorded parameters, not the current form. Failed searches and budget stops remain in the journal. Imports re-run all supported recorded results and reject mismatches without overwriting the original source file. The format has no authority to modify the archive.

## Three interpreters, one contract

Affine recurrence uses binary64 multiplication followed by addition. Logistic recurrence uses explicitly left-associated binary64 multiplication, rejects invalid initial pairs and never silently clamps. Both retain the initial state at index zero, and display finite observations rather than proofs. A future interpreter changing arithmetic or operation order needs a new kernel revision.

Collatz uses exact BigInt arithmetic and decimal-string JSON integers; the graph's vertical coordinate is an approximate log10 display, but its adjacent table carries exact values. Reaching one establishes only the finite displayed orbit. A step/digit budget is inconclusive, never a counterexample. A browser without BigInt gets an explicit unsupported-calculation message rather than rounded integers.

There is no arbitrary-code editor, `eval`, external expression library or user-written kernel execution. New interpreters require maintained code, explicit versioned semantics, bounded inputs and reference vectors. A secure expression language, workers, timeouts and composable tools are future work, not simulated here.

## Save, export, share, fork

Local save uses the current browser origin. It is not a server or account. The editor indicates unsaved changes; a successful run is not an automatic durable save. Existing draft revisions are checked to avoid knowingly overwriting a newer saved draft. Simultaneous writes still lack transactional guarantees. Files are the portable backup.

Full JSON export contains the current specification and all runs, including notes and failures. Import validates and opens a **new fork**, retaining the source's journal and recording parent identity. Forking retains all evidence; it is not a way to erase a failure or bypass the 50-run limit. To begin another journal, export first, then start a new experiment.

Specification sharing encodes UTF-8 JSON into a base64url URL fragment. It deliberately omits runs and their notes to keep a link compact. The UI explicitly distinguishes it from the full journal. The link contains the claim and creator text; base64 is not encryption. Copying it creates no server upload, shared-edit session or public repository object. On a local file URL, the UI supplies a fragment to append to another copy of the workshop, rather than claiming a machine-local path is public. Oversized links are rejected with the JSON alternative.

The same mathematical rules and portable JSON remain usable if accounts, qeva.org or this interface disappear. URL sharing still requires some copy of the matching workshop interpreter; retaining the whole release and JSON is stronger preservation than retaining a URL.

## Declared local bounds

Up to 50 runs/document, 20 local drafts, 2 MiB per imported lab and 4 MiB serialized draft collection. Shared encoded specifications have an 8,000-character creation limit; incoming fragments have a separate defensive 12,000-character limit and must still validate. Claim text: 4,000 characters; run note: 2,000; title/creator label: 160. JSON nesting is bounded to 24 levels and prototype-affecting object keys are rejected. Kernel-specific bounds are in the human-readable protocol and code.

Serialization size checks in the model use JavaScript string length; file import also checks actual bytes. Very large records may hit the notebook response bound before a kernel's own maximum budget. These are explicit local implementation bounds, not preservation-format promises for all future interpreters.
