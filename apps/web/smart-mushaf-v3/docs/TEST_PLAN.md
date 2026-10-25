# Tabyan Smart Mushaf — Test Plan & Test Suite Verification
**Document Version:** 1.0.0  
**Test Runner:** Vitest v5  

---

## 1. Test Coverage Matrix

| Test ID | Test Name | File | Result |
| :--- | :--- | :--- | :--- |
| **01** | Canonical WordKey equality | `canonicalWordKey.test.ts` | **PASS** |
| **02** | Quran text immutability | `canonicalWordKey.test.ts` | **PASS** |
| **03** | Valid provider position mapping | `canonicalWordKey.test.ts` | **PASS** |
| **04** | Invalid provider position rejection | `canonicalWordKey.test.ts` | **PASS** |
| **05** | 0/1-based conversion | `canonicalWordKey.test.ts` | **PASS** |
| **06** | Hidden -> Current transition | `smartMushafReducer.test.ts` | **PASS** |
| **07** | Current -> Confirmed transition | `smartMushafReducer.test.ts` | **PASS** |
| **08** | Skipped word handling | `smartMushafReducer.test.ts` | **PASS** |
| **09** | Repeated word handling | `smartMushafReducer.test.ts` | **PASS** |
| **10** | Duplicate result deduplication | `stabilizationAndPipeline.test.ts` | **PASS** |
| **11** | Backward result stabilization | `stabilizationAndPipeline.test.ts` | **PASS** |
| **12** | Intentional repetition acknowledgment | `stabilizationAndPipeline.test.ts` | **PASS** |
| **13** | Out-of-order / skip jump result | `stabilizationAndPipeline.test.ts` | **PASS** |
| **14** | Provider reset lifecycle | `stabilizationAndPipeline.test.ts` | **PASS** |
| **15** | Provider disconnect tracking | `stabilizationAndPipeline.test.ts` | **PASS** |
| **16** | Stale keepalive ignoring | `stabilizationAndPipeline.test.ts` | **PASS** |
| **17** | Invalid letter index word anchoring | `stabilizationAndPipeline.test.ts` | **PASS** |
| **18** | Unsupported tajweed capability | `stabilizationAndPipeline.test.ts` | **PASS** |
| **19** | Hide / reveal hint execution | `smartMushafReducer.test.ts` | **PASS** |
| **20** | Session restart cleanup | `smartMushafReducer.test.ts` | **PASS** |
| **21** | Switching mock provider scenarios | `stabilizationAndPipeline.test.ts` | **PASS** |
| **22** | No raw provider event mutates UI directly | `smartMushafReducer.test.ts` | **PASS** |
| **23** | Acceptance Scenario 1: Complete Al-Fatihah | `recitationScenarios.test.ts` | **PASS** |
| **24** | Acceptance Scenario 2: Multi-Ayah Passage | `recitationScenarios.test.ts` | **PASS** |
