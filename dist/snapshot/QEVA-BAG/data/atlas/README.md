# QEVA atlas data

The atlas is generated from canonical data and can be discarded and rebuilt.

- `logical.json` contains every current object and one edge for each exact logical dependency.
- `history.json` contains an orientation-level global history seed. Its links are historical navigation, never proof dependencies.
- `fields.json` is a high-level field/navigation map, not a claim that mathematics has one unique taxonomy.
- `frontiers.json` is an illustrative open-problem index, not a complete ranking or verification source.

Consumers must preserve each file's `scope` field. A future UI may combine the views visually, but it must not silently merge edge semantics.
