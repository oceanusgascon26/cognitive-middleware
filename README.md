# Cognitive Middleware

An evaluation kit and a middleware contract for base-agnostic cognitive organs: components that wrap a base model and add measurable, verifiable value.

Most claims that a wrapper makes a base model smarter cannot be measured, because the base does not fail on the task and the wrapper has no room to show a gain. This kit is about the layer that does add measurable value, and how to prove it against a base that actually fails. Two organs are included, both tested: instruction-following repair, and durable learning across sessions.

## Quickstart

```
npm install
npm test          # hermetic: no API key, no network
```

The tests prove the mechanics with a deterministic mock base. The repair loop lifts a weak base and never regresses a pass. The durable-learning store round-trips a lesson across a fresh process and lifts a cold base from zero. Every organ is byte-identical to the bare base when switched off.

## The two organs

Instruction-following repair. Generate, run the same machine-verifiable checker the score uses, and on a violation re-prompt with the specific violation, up to a few times. Measured on a weak base, one-shot 76.9% to 97.4% with repair. To reproduce against a real base with headroom:

```
BASE_MODEL="anthropic:claude-haiku-4-5" ANTHROPIC_API_KEY=sk-... npm run bench:instruction-following
```

or point at any OpenAI-compatible endpoint, hosted or local:

```
BASE_MODEL="openai-compat:<model>" OPENAI_BASE_URL=http://127.0.0.1:PORT/v1 npm run bench:instruction-following
```

Durable learning across sessions. A lesson learned once is stored and recalled in a later, cold session, which a prompt cannot do. The demonstration bench uses a scripted base, so the effect of recalled memory is isolated from the strength of the base:

```
npm run bench:durable-learning
```

Run it twice: the store persists to disk, so the second run loads the lesson before it does anything.

## Layout

- `src/base` the base-model interface, a deterministic mock, and adapters for Anthropic and any OpenAI-compatible endpoint.
- `src/organs/instruction-following` the checkers, the repair loop, the organ, and the reproduction task set.
- `src/organs/durable-learning` the lesson store, the organ, and the demonstration task.
- `src/harness` the base-versus-organ runner and a paired bootstrap confidence interval.
- `bench` the runnable benches. `test` the hermetic proofs. `examples` a minimal organ to copy.
- `docs/middleware-contract.md` the organ contract. `docs/method.md` why most claims cannot be measured.

## Scope

This kit ships the two organs whose gains survived scrutiny. Three further studies from the same program are deferred to a later release: a self-consistency bench, a retrieval bench, and a contamination control for an associative-reasoning claim that did not survive its own review. The associative-reasoning study depends on a stimulus set with published norms that is not redistributable here, so it will ship with an author-generated substitute. The headline numbers come from a real base with headroom, not from the mock. The mock exists so the mechanics run anywhere.

## License

MIT.
