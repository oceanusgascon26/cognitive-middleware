---
title: 'Cognitive Middleware: an evaluation kit for base-agnostic organs around a language model'
tags:
  - JavaScript
  - TypeScript
  - large language models
  - evaluation
  - instruction following
authors:
  - name: Chris Gascon
    affiliation: 1
affiliations:
  - name: Oceanus Networks LLC, United States
    index: 1
date: 9 September 2026
bibliography: paper.bib
---

# Summary

Cognitive Middleware is a small TypeScript kit for measuring whether a component wrapped around a language model earns its place. A component, called an organ, implements one contract: it takes a base model with a `generate` method and returns another. Switched off, it must return the base's bytes unchanged, and the test suite checks that. The kit ships two organs. The first is a verify-and-repair loop for machine-checkable format rules: generate, run the same checker the score uses, and on a violation re-prompt with the specific failure, up to a fixed number of retries. The second is a durable-learning store that writes a lesson learned in one process to disk and recalls it by cue in a later, cold process. A bench scores a base with and without an organ on the same items and reports a seeded paired-bootstrap interval on the difference. The hermetic tests run against a deterministic mock base with no API key and no network; the bench runs against any Anthropic or OpenAI-compatible endpoint.

# Statement of need

Claims that a wrapper makes a model more capable are common and hard to audit. Most rest on a single run, on tasks the wrapper's authors wrote, scored by a checker the wrapper was tuned against, without the base's own failure rate as the denominator. The kit exists to make the cheapest honest measurement routine. Publish the cold-fail rate first. Freeze the predicate and the failing subset before looking. Compare against a plain model given the same call budget. Keep an organ's off-switch byte-identical, so a deployment can roll back by flipping one boolean. It is aimed at engineers who ship model features and at researchers who want a minimal harness for organ-style experiments rather than a framework.

The kit's own results are deliberately modest and are reported with their controls in a separate reviewer archive [@archive]. On thirty-nine self-authored constraints the repair loop raised compliance over a single shot on three base models. At a matched call budget it did not clearly beat verifier-selected resampling. Grammar-constrained decoding met every rule it could express in one generation [@e2e4]. The durable-learning organ carried a supplied rule across a process boundary and to held-out words; it does not discover rules. Those nulls are part of the kit's purpose: the harness is built to let a result die.

# State of the field

The repair loop is an external-checker instance of the generate, critique, rewrite pattern of Self-Refine [@madaan2023] and of tool-interactive correction [@gou2023], with the judge outside the model as Huang and colleagues recommend [@huang2023]. The matched-budget comparator is verifier-selected best-of-n [@cobbe2021], and the wider question of how to spend inference compute is treated by Brown and colleagues [@brown2024] and Snell and colleagues [@snell2024]. Grammar-constrained decoding, the comparator the repair loop most needs to be measured against, follows Geng and colleagues [@geng2023] and the Outlines implementation [@willard2023]. Instruction-following evaluation with programmatic checkers follows IFEval [@zhou2023]. The kit adds no new mechanism to that literature. Its contribution is the contract, the off-switch invariant under test, and a harness small enough to read in an afternoon.

# Acknowledgements

The September 2026 controls ran on Amazon Bedrock and on a local llama.cpp build. The reference IFEval checkers are Google's, used unchanged.

# References
