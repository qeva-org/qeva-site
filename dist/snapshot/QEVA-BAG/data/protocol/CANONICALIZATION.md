# Canonical JSON and content addresses

QEVA canonical JSON follows the JSON Canonicalization Scheme number and member
ordering rules: UTF-8, object names sorted by UTF-16 code units, ECMAScript's
shortest finite-number serialization, no insignificant whitespace, preserved
array order, Unicode emitted directly, and one final LF byte. Lone surrogates
and non-finite numbers are forbidden. A content digest is the lowercase
SHA-256 of those exact bytes. Cross-language fixtures test Python and
JavaScript against the same bytes; ordinary pretty-printed record files are
not themselves assumed to be canonical serialization.

QEVA's profile is deliberately narrower than generic RFC 8785: integer-valued
numbers outside `[-(2^53-1), 2^53-1]` are rejected, whether a parser represents
them as an integer or as binary64. Exact larger integers travel as decimal
strings. This prevents two implementations from silently disagreeing about an
integer's value.

An immutable experiment revision is named by both its exact identifier and its
digest:

```text
qeva-experiment:1:logistic-sensitivity@1
sha256:<64 lowercase hexadecimal characters>
```

The readable identifier supports citation; the digest detects byte changes.
Neither proves authorship or mathematical truth. A changed experiment creates
a fork or a new revision. It never rewrites released bytes.
