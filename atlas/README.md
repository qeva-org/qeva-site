# QEVA atlas layers

QEVA uses separate graph layers because different kinds of edges answer different questions.

## Logical layer

Examples:

- `depends-on`
- `equivalent-to`
- `generalizes`
- `specializes`
- `counterexample-to`
- `representation-of`
- `preserves`
- `breaks`

A logical edge needs mathematical justification. It is not inferred from co-occurrence or citations alone.

## Historical layer

Examples:

- `introduced-in`
- `published-in`
- `independently-discovered-in`
- `cites`
- `corrects`
- `retracts`
- `formalized-in`
- `influenced`

Historical edges need provenance and may carry uncertainty or disputed-priority notes.

## Navigational / editorial layer

The interactive machinery map also contains pedagogical relations such as “useful lens” or “candidate research lens.” These must be visibly weaker than theorem-level dependency edges.

## Rule

Never silently promote:

```text
citation -> logical dependence
correlation -> mechanism
analogy -> equivalence
simulation -> proof
publication -> truth
popularity -> importance
```
