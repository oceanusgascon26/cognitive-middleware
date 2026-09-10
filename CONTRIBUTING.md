# Contributing

Thank you for looking at the kit. It is small on purpose: two organs, one contract, tests that run with no key and no network.

## Reporting a problem

Open an issue at https://github.com/oceanusgascon26/cognitive-middleware/issues. Say which command you ran, what you expected, what happened, and the Node version. If a bench number does not reproduce for you, include the base model and endpoint you pointed it at; the bench makes new generations, so digits differ from run to run by design.

## Proposing a change

1. Fork, branch, and keep the change small enough to review in one sitting.
2. Run `npm install` and `npm test`. The tests are hermetic and must stay green. A wrapper that returns anything but a base model fails the contract test; an organ that changes bytes while switched off fails it too.
3. If you add an organ, add its off-switch test and a checker that is a pure function of the model text.
4. If you change a checker, add the case that motivated the change to the tests so the old behavior cannot return unnoticed.
5. Open a pull request describing what the change measures differently, not only what it does.

## Getting help

Questions go in issues as well, labeled `question`. There is no chat channel. Replies come from the maintainer, who is one person, so allow a few days.

## Code of conduct

Be direct and be kind. Criticize the measurement, not the person. Anything that would not be acceptable in a code review at work is not acceptable here.
