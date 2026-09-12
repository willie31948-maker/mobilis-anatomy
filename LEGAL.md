# Where the legal line sits, and how this app stays on the safe side

Not legal advice — I'm an engineer, not your attorney. But these are the
constraints that shape the architecture, and you should get a healthcare
attorney to confirm before you launch commercially.

## Your instinct was right

You said: *"perhaps then not medically diagnose, rather just analyze and
interpret the test results."* That single change is the difference between a
product you can ship in South Africa and one that needs regulatory approval.

## The distinction that matters

**Software that diagnoses is a medical device.** Under SAHPRA (the South
African Health Products Regulatory Authority), software intended to diagnose,
prevent, monitor, treat or alleviate disease falls within the medical device
definition, and medical devices require registration and a licensed
establishment. SAHPRA has also issued specific guidance on AI/ML-enabled
devices. Registration is slow, expensive, and requires a quality management
system — it is not a solo-founder undertaking.

**Software that informs, educates and coaches is not.** General fitness,
wellness and exercise applications sit outside that definition.

There is a second layer: **HPCSA**. Diagnosing musculoskeletal conditions is a
scope-of-practice act reserved for registered professionals — physiotherapists,
biokineticists, doctors. An app that diagnoses is arguably practising without
registration, and that exposure attaches to *you*, not only to the company.

## What this means concretely in the code

The architecture enforces the distinction rather than relying on a disclaimer
nobody reads:

| Never do this | What this app does instead |
|---|---|
| "You have gluteus medius tendinopathy" | "Gluteus medius appears long/underactive — moderate confidence (62%)" |
| A single confident answer | *Ranked* possibilities, each with the evidence that produced it |
| Implied certainty | Confidence saturates below 100% — certainty is never claimed |
| "Treatment plan" | "Exercise programme" / "general exercise guidance" |
| "Prescribe" | "Suggest" |
| "Patient" | "User" |
| "Symptoms indicate…" | "Findings you reported are consistent with…" |
| Silence on serious signs | Red-flag screen that **refuses** to produce a programme and refers out |

The red-flag screen is not decoration. Eight conditions — cauda equina, DVT,
fracture, progressive neurological loss, malignancy, infection, vertebral
fracture risk — each short-circuit the entire pipeline and return a referral
instead of exercises. There are tests asserting that no programme can be
generated when any of them fires. That refusal is the most legally important
behaviour in the app, and it is also simply the right thing to do.

## POPIA — this is health data

Health information is **special personal information** under POPIA, which
raises the bar considerably above ordinary app data:

- Explicit, informed, opt-in consent before collecting anything health-related.
- Purpose limitation: use it only for what the user consented to.
- Encryption at rest and in transit — the current prototype stores programmes
  in memory precisely so it is not pretending to be production-ready.
- A real deletion mechanism, not a support-ticket promise.
- Appoint an Information Officer registered with the Information Regulator.
- Breach notification obligations.

If you ever host outside South Africa, cross-border transfer rules apply too.

## Practical launch checklist

1. **Terms of use and a health disclaimer** users must actively accept — not a
   footer link. Drafted by an attorney who knows healthcare.
2. **Onboarding screen** stating plainly: this is not a diagnosis, not
   treatment, and not a substitute for professional care.
3. **Red-flag screen before any assessment.** Already built.
4. **Professional indemnity insurance.** Get a quote before launch; it is
   cheaper than you expect and the conversation itself will surface risks.
5. **Have a physiotherapist or biokineticist review the exercise library and
   the reasoning rules.** I have written these to standard clinical reasoning
   patterns, but I am not a clinician and content review is not something to
   skip. This is the single highest-value thing you can do next.
6. **Consider a clinician partnership.** A registered physio as a named clinical
   advisor strengthens the product, the marketing, and your legal position
   simultaneously.
7. **Never let the copy drift.** "Diagnose", "treat", "cure", "heal" and
   "patient" must stay out of the app, the store listing, and the ads. Marketing
   language can re-classify a product that the code kept compliant.

## If you later DO want diagnostic claims

It is a legitimate path, just a different business: SAHPRA medical device
registration, a quality management system (ISO 13485), clinical validation
evidence, and likely clinician oversight built into the product. Budget years
and serious capital. Almost every successful app in this space starts where you
are starting — wellness and coaching — and adds regulated claims later, if ever.
