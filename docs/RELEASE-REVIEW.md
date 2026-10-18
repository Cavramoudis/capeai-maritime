# Independent release review

Reviewed 18 October 2026. Scope: `src/model.mjs`, `src/studies.mjs`, `src/exports.mjs`, their tests, original export field mappings, the static build/deployment configuration, and the new `src/app.mjs`, `index.html` and stylesheet. Source was reviewed while the implementation agents were making fixes; resolved items below were re-read and reproduced after the changes. UI coverage is source inspection and a Node state/event fixture with a minimal DOM stub, not visual browser or assistive-technology testing.

## Result

No unresolved actionable source finding remains within this review's scope. Funding, debt, tax, fee, carry and annual cash-flow identities held across independent randomized checks. The PowerPoint text-corruption, asynchronous export, imported-draft replacement and damaged-workspace findings were corrected and reverified. Browser journeys and visual/accessibility verification are separate work owned by the parent agent. The review does not establish legal tax correctness, monthly liquidity sufficiency, or investment suitability; those remain the documented model boundaries.

## Final targeted verification

### Resolved P2 — Valid study text could create an invalid PowerPoint file

The initial string validation permitted characters XML 1.0 forbids. The PowerPoint builder passes the study name to document metadata and slide text. The bundled library escapes markup but does not remove those control characters. Both model validation and native import/export now reject forbidden control characters and incomplete Unicode sequences with clear errors.

Original reproduction with the actual pinned vendor library, before the fix:

```js
const study = createExampleStudy();
study.name = 'Null\u0000name';
study.vessel.name = 'Control\u000btext';
calculateStudy(study).valid; // true
const deck = buildPowerPoint(PptxGenJS, study);
const bytes = await deck.write({ outputType: 'arraybuffer' });
```

Before correction, the ZIP generated successfully but its XML failed parsing in `docProps/core.xml` and `ppt/slides/slide1.xml` with `not well-formed (invalid token)`. The historical reproduction artifact is `/tmp/capeai-adversarial-control.pptx`.

After correction, independent checks rejected all seven tested values: NUL, vertical tab, U+001F, U+FFFE, U+FFFF, an unpaired high surrogate and an unpaired low surrogate. Model calculation, native import, native export and PowerPoint building all rejected those inputs. Greek/CJK text, emoji, tabs and ordinary newlines remained valid and roundtripped unchanged. A real deck made from these permitted Unicode inputs generated successfully; Python's XML parser accepted all **25 XML parts**. That verification artifact is `/tmp/capeai-adversarial-unicode-valid.pptx`.

### Resolved P3 — Oversized or duplicate-ID workspace could lose records on save

The original reader sliced the saved array to 40 without marking an oversized workspace damaged. A 41-entry version-1 workspace could therefore lose its final record on the next draft save. Duplicate IDs could similarly collapse records during updates or deletion.

The reader now marks both conditions damaged and reports a warning. Independent fixtures containing 41 valid entries or two duplicate IDs confirmed that draft saves, named saves and deletion all refuse to write; the original stored string stays byte-for-byte unchanged. This remains a recovery edge case, since the normal save API will not create a 41st entry.

## Findings fixed during review

| Finding | Severity when found | Verification after fix |
| --- | --- | --- |
| PowerPoint loader checked `globalThis.pptxgen`, but the pinned bundle exports `PptxGenJS` | P1, feature blocker | Fresh source uses `globalThis.PptxGenJS`; actual vendor execution confirms that global is a function. Real-PPTX regression test passes. |
| Engine accepted 300 CAPEX rows, but import/save/export stopped at 200 | P2 | A 300-row study now calculates, saves and JSON-roundtrips with all 300 rows. Native charter and text limits also match the schema. |
| Empty legacy depreciation/inflation/brokerage inputs acquired different defaults | P2 | Empty fields now import as 0% / 2.5% / 1.25%, matching the original screen, with a specific warning. Explicit zero remains zero. A $10M, five-year blank-depreciation legacy case retains $10M gross exit rather than $7.7378M. |
| Legacy scrap tonnage precedence reversed | P2 edge case | `s_ldt=12000`, `v_ldt=10000`, $500/ton now gives $6M gross scrap, matching the old calculation path. The latest old HTML does not actually render an `s_ldt` input, so this is an older/custom-file compatibility edge. |

## Independent financial verification

- The final complete checked test run passed **39 tests**, including real PowerPoint generation, delayed-library export snapshot preservation, invalid/valid Unicode, corrupted-workspace preservation, all seven manual examples and 32 seeded financial reference cases. Syntax checks for all four application modules also passed.
- A deterministic randomized sweep used **4,000 valid studies**, varying debt ratio, interest, balloon, maturity versus hold, tax/depreciation, fee percentages, operating costs, earning days, CAPEX timing, carry and all exit modes. It was repeated successfully against the final checked engine after the IRR precision update.
- **60,214** annual breakeven checks independently substituted the calculated rate into the operating cash equation and confirmed coverage after tax, CAPEX and contractual debt service. Sale proceeds, carry and early-sale settlement were excluded consistently with the contract.
- **3,084** reported-OK IRRs were checked against independently discounted cash flows. Residuals were scaled against the absolute discounted cash flows, which is necessary for long, severely negative-return cases with large cancellation.
- Every randomized study repaid exactly its original debt within floating-point tolerance. Every annual row reconciled `equityPreCarry = assetCashFlow − interest − principal + assetTax − equityTax`. Investor distributions minus contributions equalled investor cash flow, and aggregate profit equalled the sum of investor flows.
- The simplified tax book, treatment of current-year CAPEX, final-year gain offsets, year-end timing, debt maturity, whole-deal carry and additional contributions are internally consistent with `MODEL-CONTRACT.md`. These are explicit modeling conventions, not hidden defaults or purported jurisdiction-specific tax rules.

## Import/export and deployment observations

- Actual JSON `__proto__` and `constructor.prototype` payloads were excluded without prototype pollution. Unknown credential fields are removed by native import/export allowlists. Model validation rejects unknown fields when called directly.
- HTML report output escapes study text and has a restrictive CSP; no script tag appeared in hostile-text report cases. CSV formula defense treats text separately from signed numeric cash flows. Spreadsheet application behavior for every possible control-character prefix was not tested.
- Original field mappings for purchase price, debt, interest, tenor, balloon, six OPEX categories, inflation, flat OPEX, base hire, earning days, annual hire overrides, manual/scrap exit, SPV fees and carry match the original root IDs. Legacy survey budgets deliberately move to Year 1 with a warning; new tax, transaction-cost, working-capital and disposal assumptions are disclosed as defaults.
- The build copies explicit application roots (`index.html`, `src`, `vendor`) and documentation into `dist`; it does not copy `.git`, the abandoned `app 2` folder, or the external forensic snapshot. The release-review file is excluded. The local server resolves real paths, rejects dot paths, binds to localhost, and checks the resolved file remains below `dist`.
- The optional Pages workflow uploads only `dist`, runs tests/checks first, and requires the downloadable manual to exist. PR runs do not deploy. The initial release instead publishes the locally verified output to the `gh-pages` branch because the available OAuth token lacks workflow scope. The workflow is retained as `.github/pages-workflow.yml`, outside the active workflow directory. Final browser and deployed-release checks remain separate evidence from this source audit.

## New UI source and state review

### Resolved P2 — First PowerPoint export could observe later edits

`exportPowerPoint` originally validated the mutable study object, awaited its first vendor-library load, and then used that same reference to construct the deck. Editing a valid assumption during loading changed the requested report. The UI now passes a copy, and the export function itself retains the engine's validated study copy before the first `await`, using it for both the deck and filename.

The regression deliberately defers the loader callback, changes the original name and manual exit value from $12,345,678 to $98,765,432, then generates a real PPTX using the pinned vendor. Parsed slide XML and the download filename retain the initial name and value and exclude the later inputs. The export-specific suite passes **7/7** tests. The reviewer implemented only this narrow exporter correction and its regression at the parent agent's request; other source findings were fixed by the implementation agents.

### Resolved P2 — An imported draft could be replaced without the copy guard

`replaceStudy` initially set every replacement clean, including imports that had no saved library entry. An immediate New/Open/second import could therefore replace that draft without offering a named copy. Imports now request `needsCopy:true`; existing saved entries and untouched synthetic/blank studies retain their intended clean state. The independent state fixture confirms that an imported study is dirty, a subsequent replacement opens the keep-copy dialog, and Cancel preserves it.

### Checked paths and limits

- Imported study names, vessel details, CAPEX descriptions, notes, validation messages and import notices are escaped in HTML or assigned through `textContent`. Numeric attribute/chart/table interpolation comes from native numeric inputs or validated numeric study data. The fixture exercised hostile name/notes payloads and confirmed encoded text rather than injected markup. No application path from imported text to a dynamic script or executable URL was found.
- Each input edit recalculates `state.model` synchronously. The fixture confirms changed inputs match a fresh engine calculation and invalid inputs replace the previous return with an unavailable state. CSV uses that current model; report output recalculates; PowerPoint now snapshots before asynchronous work. Scenarios outside supported numeric bounds render unavailable instead of inventing a return.
- Autosave failures display “Draft not saved”; the fixture confirms an unload attempt is guarded when saving remains blocked. Damaged stored work retains the previously verified refusal-to-overwrite behavior. This browser-local design does not encrypt data at rest or provide cross-device synchronization.
- The import handler checks file size before reading, then uses the schema allowlist; `parseStudyJSON` independently enforces the UTF-8 byte limit. Loaded library records also pass that native study normalization.
- Code supplies form labels/help/error associations, native buttons/dialog/details, tab roles and Arrow/Home/End handling, focus requests after tab/navigation actions, table captions/row headers, and SVG title/description text. The ArrowRight tab transition passed the state fixture. These observations do not certify WCAG conformance, actual focus order, contrast, responsive layout or screen-reader behavior.
- The application CSP denies network connections, objects, base URL changes and form submissions; its scripts/styles load from the same origin. There are no account controls, telemetry calls or AI request paths in the new application module. Self-hosted vendor code was assessed separately below.

The state fixture also rendered all four views and checked blocked storage, restored saving and out-of-bounds sensitivity output. Evidence: `/private/tmp/capeai-ui-state-review.mjs`. It uses a minimal DOM stub, so it does not test browser event-order behavior, downloads, popup blocking, layout or CSS rendering. The parent was asked to check clicking another control immediately after changing the holding period because its blur/change handler rerenders the form; no browser result is claimed here.

## Pinned vendor and advisory audit

Checked on 18 October 2026 using official npm metadata, the official npm tarball, an isolated temporary lockfile, npm's advisory service and the linked GitHub advisory records. No packages were installed, no `node_modules` directory was created, and lifecycle scripts were disabled. The app itself declares no npm runtime dependencies; its self-hosted export bundle still requires this separate review.

The downloaded `pptxgenjs@4.0.1` tarball has SHA-1 `cd0f202f62f74d950bcd217e90b766da8f73742e`, matching [official npm metadata](https://registry.npmjs.org/pptxgenjs/4.0.1). Its `package/dist/pptxgen.bundle.js` is **byte-for-byte identical** to the vendored file: **460,889 bytes**, SHA-256 `4fb9eac5cfefb213e2d8743c2b7151025f31bfb3f834c73c12062916daa0f3f8`. The bundle explicitly identifies **JSZip 3.10.1** and **core-js 2.6.11**. These are observed embedded versions, not inferred from semver ranges.

The isolated metadata audit pinned PptxGenJS 4.0.1, JSZip 3.10.1 and core-js 2.6.11, then resolved the package graph with `npm install --package-lock-only --ignore-scripts`. `npm audit --json --ignore-scripts` reported **two high-severity affected package entries**: `image-size@1.2.1` and the propagated `pptxgenjs` entry. These correspond to two image parser denial-of-service advisories: [JXL/HEIF infinite loops, CVE-2025-71329](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) and [ICNS infinite loops, CVE-2025-71330](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr). The affected ranges include 1.2.1; the advisory records name 2.0.3 as patched. An automatic downgrade suggested by npm was not applied.

**Reachability matters:** the official PptxGenJS package's browser mapping explicitly sets `image-size` to `false`; the checked browser bundle does not contain the image-size module or the identified JXL/HEIF/ICNS parser implementation. CapeAI ships that browser bundle and creates text/table decks; it does not install the Node package graph or accept images for deck construction. The audit result is therefore a dependency-management warning for using the full Node package, **not a demonstrated vulnerability in CapeAI's deployed browser export path**. Reassess this if image handling or server-side export is introduced.

No npm advisory entry was returned for the pinned JSZip/core-js versions in this graph. JSZip 3.10.1 is outside the affected ranges of the reviewed older [path traversal](https://github.com/advisories/GHSA-36fh-84j7-cv5h) and [prototype pollution](https://github.com/advisories/GHSA-jg8v-48h5-wgxg) advisories. This does not establish that these libraries or every supporting module are free of unknown defects. The resolved metadata graph is not a complete reconstruction of every frozen dependency embedded when the upstream bundle was built. core-js 2 is old code; retain its notices and reassess at vendor updates.

Reproduction evidence remains under `/private/tmp/capeai-vendor-audit-KVGvTi`: `package.json`, `package-lock.json`, `npm-audit.json`, `npm-pack.json` and `pptxgenjs-4.0.1.tgz`. The source project was not changed by the dependency audit.

## Additional release-check audit

The initial `check-release.mjs` verified only paths named by `manifest.files`; it did not enumerate the actual release tree or require complete manifest coverage. In an isolated fixture, an empty `manifest.files` plus the required file names and an unlisted `.env` produced `Release verified: 0 checksummed files...`. No real secret was used, and the application build directory was not changed. Reproduction fixture: `/private/tmp/capeai-release-check-pJ0XrW`.

**Resolved and independently verified.** The checker now enumerates the actual tree, requires exact manifest coverage, rejects symlinks and unsafe manifest paths, and applies blocked-path rules to actual paths including `.env.*`. A valid isolated fixture passed. Seven invalid variants all failed for the expected reason: empty manifest plus unlisted `.env`, omitted application checksum, `../` manifest traversal, a file symlink, a directory symlink, listed `.env.local`, and content changed after hashing. Regression fixtures: `/private/tmp/capeai-release-regression-dHJG2a`. The manifest is an integrity/reproducibility check, not a cryptographic signature proving publisher identity.

Other than the explicitly delegated asynchronous export correction and regression above, this reviewer did not edit application source. All independent inputs were fabricated; no live account, external AI service or application database was used. The vendor audit sent only public package/version metadata to npm's advisory service.
