# The middleware contract

A base is anything that maps a prompt to text. The interface is one method. `generate(prompt, opts)` returns a string, and an id names the base in reports. That's the whole surface an organ is allowed to assume. The definition lives in `src/base/types.ts`.

An organ wraps a base and returns an augmented base. The wrapped thing has the same interface as the base, so organs compose, and the output of one wrap is a valid input to the next. An organ carries a name, an `enabled` flag, and one method, `wrap(base)`, returning the augmented base.

Three rules govern an organ, and the kit enforces all three.

First, same interface. `wrap(base)` returns a base, with the base interface and nothing wider. A caller that has a base never has to know whether an organ is in the way.

Second, byte-identical when off. When `enabled` is false, `wrap(base).generate(...)` makes the same call to the base with the same arguments and returns the same output. An organ that changes behavior while off is a bug. The kit asserts this in the tests: with the flag off, the wrapped base and the bare base return the same bytes, even on a prompt the organ would otherwise act on. The same holds when the organ is on and has nothing to do, so wiring an organ in front of a base is safe on every turn, including the ones where it does nothing.

Third, score against the same predicate the organ repairs against. This rule is about measurement rather than the interface. When the score and the repair share one predicate a machine can check, an organ cannot take credit for output that fails the constraint. A separate, softer score reopens that gap. The instruction-following organ makes this literal. It derives the checkers from the prompt, repairs against them, and the harness scores with the same checkers.

Writing an organ is small. Implement `name`, `enabled`, and `wrap(base)`. Inside `wrap`, return an object with the base id and a `generate` that either does the organ's work or calls the base unchanged when off or not applicable. `examples/minimal-organ.ts` is a complete organ in a few lines, with a note on the invariant. The two organs in `src/organs` are the working references, instruction-following repair and durable learning across sessions.

An organ measured on a base that always passes shows no delta. That is not a null result about the organ. It is a statement about the base, and `docs/method.md` covers why the two get confused and how the benches avoid it.
