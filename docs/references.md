# CapeAI references and source boundaries

Reviewed on 18 October 2026.

These sources establish general principles and writing guidance. CapeAI's equations and examples describe its own implementation.

No author or institution listed here has approved, audited, or endorsed CapeAI.

## Valuation principles

1. Aswath Damodaran, [Approaches to Valuation](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/lectures/approach.html), NYU Stern. This supports the distinction between asset and equity cash flows. It also supports matching cash-flow and discount-rate bases.
2. Aswath Damodaran, [First Principles](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/cfin2E/firstprin.htm), NYU Stern. This supports evaluating both the amount and timing of investment cash flows.
3. Aswath Damodaran, [Capital Budgeting under Certainty](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/lectures/cbcert.html), NYU Stern. This discusses NPV, IRR, multiple IRRs, investment scale, working capital, and debt financing.
4. Aswath Damodaran, [Financial Measures and Ratios](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/definitions.html), NYU Stern. This supports the cash-flow distinction between operating earnings, reinvestment, and financing.
5. Aswath Damodaran, [Cash Flows](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/littlebook/cashflows.htm), NYU Stern. This supports treating capital expenditure and working-capital investment as cash requirements.

CapeAI does not use a continuing-business perpetuity for terminal value. Its terminal value is an explicit vessel disposal assumption.

Its simplified tax model is a software assumption. The references do not establish an applicable shipping tax regime.

## Writing guidance

6. ASD Simplified Technical English Maintenance Group, [ASD-STE100 Issue 9](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf), dated 15 January 2025. The official search index confirmed Issue 9 and its procedural-writing rules. Direct PDF retrieval returned HTTP 403 during this review.
7. ASD Simplified Technical English Maintenance Group, [official standard website](https://www.asd-ste100.org/). This identifies the standard and its maintenance organization.

The project uses an STE-inspired editorial target. At least 80% of measured prose sentences should contain no more than 25 words.

Procedural steps should contain one action and no more than 20 words. Essential financial technical terms remain in the controlled project glossary.

This is not an ASD-STE100 conformity claim. A sentence-length check does not verify the complete grammar rules or approved-word dictionary.

## Historical implementation evidence

8. [Original repository snapshot](https://github.com/yiannisk9/capeai.com/tree/e45add581ef9adc3a84ff203363e428c3b29225b). The current-system document describes this fixed snapshot.
9. [Original main financial engine](https://github.com/yiannisk9/capeai.com/blob/e45add581ef9adc3a84ff203363e428c3b29225b/index.html#L1291-L1439).
10. [Original presentation financial engine](https://github.com/yiannisk9/capeai.com/blob/e45add581ef9adc3a84ff203363e428c3b29225b/index.html#L3202-L3263).
11. [Original study export serializer](https://github.com/yiannisk9/capeai.com/blob/e45add581ef9adc3a84ff203363e428c3b29225b/index.html#L2631-L2638).

The forensic findings concern the reviewed snapshot. They must not be presented as defects in a later release without new evidence.
