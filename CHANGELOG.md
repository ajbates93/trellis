# Changelog

## [0.16.1](https://github.com/ajbates93/trellis/compare/v0.16.0...v0.16.1) (2026-05-30)


### Bug Fixes

* **demo:** allow demo entry page and demo endpoints through server auth middleware ([89b33a8](https://github.com/ajbates93/trellis/commit/89b33a87e923d408b5592b91640b00005d84bcb8))
* **demo:** allow demo routes through server auth middleware ([99e80d3](https://github.com/ajbates93/trellis/commit/99e80d3184e0337118c707f4b83412554d77e95f))

## [0.16.0](https://github.com/ajbates93/trellis/compare/v0.15.1...v0.16.0) (2026-05-30)


### Features

* **api:** add demo-request endpoint ([bf3491d](https://github.com/ajbates93/trellis/commit/bf3491dc98d2337ec88c8512bd14bcb439821619))
* **db:** add demo_requests table ([0a011a6](https://github.com/ajbates93/trellis/commit/0a011a6bb008a5af8d67194b7252a65bbe3eacd5))
* demo environment (DEMO_MODE) ([625b60f](https://github.com/ajbates93/trellis/commit/625b60f27181871c737fcd0943e0b7bc138b637f))
* **demo:** add centralised demo-mode helper ([34bf5ab](https://github.com/ajbates93/trellis/commit/34bf5aba4d1ef3236a048dcd851256870c80297d))
* **demo:** add guarded seedDemo routine and fixture ([0d331f4](https://github.com/ajbates93/trellis/commit/0d331f40315a7fe2ff25a960722722d46e3a8266))
* **demo:** add nightly demo-reset scheduled task ([f7186ef](https://github.com/ajbates93/trellis/commit/f7186ef3b3d1fa323e59a3177ad8367f50b2a710))
* **demo:** add one-click admin login endpoint ([bcf2a90](https://github.com/ajbates93/trellis/commit/bcf2a90e6b6de2338270273312c9c9189a3d2a3b))
* **demo:** add one-click demo entry page ([5e74198](https://github.com/ajbates93/trellis/commit/5e74198e5bbfddf215e541506d545dadd7f61c73))
* **demo:** add persistent demo banner ([83d4876](https://github.com/ajbates93/trellis/commit/83d4876f1867b75446073d69739f0f3f2d87aa23))
* **demo:** add secret-guarded manual reset endpoint ([382416e](https://github.com/ajbates93/trellis/commit/382416e9b09ff0dd41dab06b3eadc6f3bfb44f51))
* **demo:** expose demoMode in runtime config and document env ([70759d5](https://github.com/ajbates93/trellis/commit/70759d5c6ad9396608a4506d1636e69353afd491))
* **demo:** hide Slack integration in demo mode ([e879414](https://github.com/ajbates93/trellis/commit/e87941435393964c4f4614ef9e4b1e632badb450))
* **demo:** redirect root to demo login in demo mode ([e5f6b88](https://github.com/ajbates93/trellis/commit/e5f6b88603ce4d2d93a16fefb5bf31b00dbd6f9e))
* **demo:** suppress outbound email in demo mode ([6c7c3ad](https://github.com/ajbates93/trellis/commit/6c7c3ad638ac9fd922bf8104282ee428058aa5aa))
* **email:** add demo request templates ([181130a](https://github.com/ajbates93/trellis/commit/181130a83be0eb42db7ccc46c71a35b5fc44bfbb))
* **marketing:** add bare dark layout ([762c9fd](https://github.com/ajbates93/trellis/commit/762c9fd242abd5571f97ee8d6d9e7c15524ca0a8))
* **marketing:** add plausible analytics scoped to marketing layout ([24a9c46](https://github.com/ajbates93/trellis/commit/24a9c466e181e8b22540c832b0dad50f72a28d18))
* **marketing:** buddy system explainer ([e13ec35](https://github.com/ajbates93/trellis/commit/e13ec35bef406467b6846079f34333a48b70b14e))
* **marketing:** compose homepage at apex root ([039e923](https://github.com/ajbates93/trellis/commit/039e92316ba3c657cd446168c20c434ecc8f347d))
* **marketing:** demo request form with honeypot ([566b838](https://github.com/ajbates93/trellis/commit/566b8382462b821f373c211d2fa1b8e9a0817d91))
* **marketing:** drop mock sidebar in feature showcase ([598ef35](https://github.com/ajbates93/trellis/commit/598ef3553ddb098aab53f2294a84119074e578b3))
* **marketing:** feature showcase with tabbed product screenshots ([3284077](https://github.com/ajbates93/trellis/commit/32840774e8db3336e4dbb97e16a05534784cc8f2))
* **marketing:** footer with version ([4f3d43c](https://github.com/ajbates93/trellis/commit/4f3d43c6b70cefdbaeb2a734c5f54fd4ea72b7be))
* **marketing:** header component ([f791793](https://github.com/ajbates93/trellis/commit/f79179379f5d1b8c4dd6793d0afe31c4b173a141))
* **marketing:** hero section ([261e822](https://github.com/ajbates93/trellis/commit/261e82250c82bd192bab0ae1575e9225308d45a2))
* **marketing:** how it works section ([05e77f4](https://github.com/ajbates93/trellis/commit/05e77f46c6d7259fac0e7d3f2cd947ddd1c2d70f))
* **marketing:** problem section ([d684272](https://github.com/ajbates93/trellis/commit/d684272f30b19aaac4dd699e76bce319144aafba))
* **marketing:** remap feature screenshots and drop double-frame ([599e7f7](https://github.com/ajbates93/trellis/commit/599e7f700951ed558ed645d0954eb5278597a825))
* **marketing:** testimonial section ([24a1aa8](https://github.com/ajbates93/trellis/commit/24a1aa8ef7b857d6c843ccc3d10b36cd3173ee99))
* **marketing:** use TrellisLogo SVG instead of plant emoji ([fcf661c](https://github.com/ajbates93/trellis/commit/fcf661c2dee78bcafb31b66469fcf2438a3b2ac2))
* **rate-limit:** cap demo requests at 5 per hour per ip ([0d3264e](https://github.com/ajbates93/trellis/commit/0d3264ecf31f70df073048370342da2464d39f9e))
* **routing:** hostname-based marketing/app split ([1ea2bab](https://github.com/ajbates93/trellis/commit/1ea2babd7e968b3fb56495c3b598af912b703e80))
* **schemas:** add demo request zod schema ([158abc7](https://github.com/ajbates93/trellis/commit/158abc753d238fa56bcb86e44053b3d66f4b5840))
* wording changes ([20bae3a](https://github.com/ajbates93/trellis/commit/20bae3a8856e8e4eb34a199bea9984492b5fbe89))


### Bug Fixes

* **auth:** make marketing routes public and redirect dash root to dashboard ([fc0bbdc](https://github.com/ajbates93/trellis/commit/fc0bbdc67602578451503de5c6eaaf793bed3c1b))
* **auth:** send google oauth callback to /dashboard ([fc49dd1](https://github.com/ajbates93/trellis/commit/fc49dd167694c33e4b10ad8164ee0453dfded628))
* **demo:** resolve strict type errors in seedDemo fixture ([afd48f0](https://github.com/ajbates93/trellis/commit/afd48f098103bcffb8fbdfe9e24c9070d1e8e855))
* **marketing:** address copilot pr review ([cac008b](https://github.com/ajbates93/trellis/commit/cac008b77dbabfe3de6f5dd662acc3898c831da1))
* **marketing:** align hero columns to top so screenshot sits with headline ([1c4767a](https://github.com/ajbates93/trellis/commit/1c4767a81a14dbd2a56793dd0c6402cbc1656957))
* **marketing:** only rotate hero screenshot on lg screens ([d6e35bf](https://github.com/ajbates93/trellis/commit/d6e35bf62953f6a05d47adafdae7c5523286f34a))
* **marketing:** replace misleading 'no auto-billing' reassurance ([b7a0f0e](https://github.com/ajbates93/trellis/commit/b7a0f0eaee5cece84e8f96359c553a286df03db2))
* **marketing:** rework demo reassurance bullets to match real flow ([04fcf9d](https://github.com/ajbates93/trellis/commit/04fcf9d1f9450f6ba69a18ec5b5cd2055c96ee6b))


### Performance

* **marketing:** replace marketing PNGs with WebP (87% smaller) ([9386b0b](https://github.com/ajbates93/trellis/commit/9386b0b36744f76b7f10b74b82669c6528f311fd))


### Refactoring

* **demo:** harden truncate FK order and drop unused private demoMode config ([8d1ee2e](https://github.com/ajbates93/trellis/commit/8d1ee2ed9f6a7721330f0a6327764f0f60d0559b))
* **demo:** use getSetCookie and clearer not-seeded error ([f865e5f](https://github.com/ajbates93/trellis/commit/f865e5f2163658b6551c3807e981c62445cd8a5a))
* rename app subdomain from dash to my ([7fd70f8](https://github.com/ajbates93/trellis/commit/7fd70f8ba048bd42ab44664ea37405372649c13d))


### Documentation

* add demo environment design spec ([c7faa3b](https://github.com/ajbates93/trellis/commit/c7faa3b2698d8e50eac0ce74fd58306e75eb6eea))
* add demo environment implementation plan ([d4ed019](https://github.com/ajbates93/trellis/commit/d4ed019bf304b1306025330e7e65ed4c6e4b5cda))
* **demo:** update spec CI section for release-gated demo deploy ([5369964](https://github.com/ajbates93/trellis/commit/536996498792cd597dfbd411b6968d782ee2cfff))
* implementation plan for marketing homepage ([07e48f4](https://github.com/ajbates93/trellis/commit/07e48f422654327b70b877580df34ef810dd1a45))
* marketing homepage design spec ([cbacf3b](https://github.com/ajbates93/trellis/commit/cbacf3b04d9cb04b5a595f8c75dda1fa4c3f7923))


### Miscellaneous

* **demo-request:** point notification to ajbates93@gmail.com for testing ([2f499bb](https://github.com/ajbates93/trellis/commit/2f499bba2397d5abe50d25fcee866e108d1e9e62))
* **demo-request:** revert notification email to work address ([3acdb69](https://github.com/ajbates93/trellis/commit/3acdb6935018a243d9bd45e0932ecc58b8d1ba51))
* **marketing:** add real dashboard hero screenshot ([f9c99cc](https://github.com/ajbates93/trellis/commit/f9c99cc4af0447495f9b47cadb35ded296684832))
* **marketing:** add real feature screenshots ([7930b36](https://github.com/ajbates93/trellis/commit/7930b360dc214b51f9dbe256966d4289ab581f43))
* **marketing:** placeholder PNGs for hero and feature screenshots ([2157977](https://github.com/ajbates93/trellis/commit/2157977cf86db70ab067a6fbd154273797a0617b))
* **marketing:** replace hero screenshot with cleaner capture ([eab1e59](https://github.com/ajbates93/trellis/commit/eab1e590c4e020b8b5cfd4a7a516effaa6cf2293))
* **marketing:** robots.txt ([7d875f4](https://github.com/ajbates93/trellis/commit/7d875f4049434f1916a62766d1caf1b1bbd6c1d6))


### Tests

* **demo:** add negative-path email test and tidy log line ([eec5daa](https://github.com/ajbates93/trellis/commit/eec5daa70bf8618aded0ac8db404590bd4450dfd))
* **demo:** cover unconfigured reset-secret fail-closed path ([9491e33](https://github.com/ajbates93/trellis/commit/9491e3317062c52e6e04034cf138a08f02c582df))

## [0.15.1](https://github.com/ajbates93/trellis/compare/v0.15.0...v0.15.1) (2026-05-17)


### Bug Fixes

* save fix and move supporting data to column ([506e682](https://github.com/ajbates93/trellis/commit/506e682fcc86bb30be949e2747fadff46a225e46))
* theme ([4bc0c69](https://github.com/ajbates93/trellis/commit/4bc0c69af64571fec80cc17b6e4e8dc76561cecb))

## [0.15.0](https://github.com/ajbates93/trellis/compare/v0.14.1...v0.15.0) (2026-05-09)


### Features

* **db:** add notifications table and swap email preferences to jsonb ([4ff54ff](https://github.com/ajbates93/trellis/commit/4ff54ff9020a97e6247ee605ae1741036e5e7d4b))
* **email:** add review lifecycle templates ([2023060](https://github.com/ajbates93/trellis/commit/2023060d920a4e90620d7597946dc09711625d36))
* notifications and emails ([a52548e](https://github.com/ajbates93/trellis/commit/a52548ea2d9a0713bae0e5b2a9f2d546a4a4f8ca))
* **notifications:** add /notifications inbox page ([0232af6](https://github.com/ajbates93/trellis/commit/0232af661988479c6eb38752d820f618118e2185))
* **notifications:** add createNotification helper ([882eafc](https://github.com/ajbates93/trellis/commit/882eafcf4a1758262e1efdf8bc59b09b54c4c7cb))
* **notifications:** add goal-reminders cron ([92b9ed1](https://github.com/ajbates93/trellis/commit/92b9ed1625f68e5ef490f19396a81e9753063b63))
* **notifications:** add list endpoint with cursor pagination ([f5e1104](https://github.com/ajbates93/trellis/commit/f5e11043cd2f35af278da557aaa2120b3c1f488f))
* **notifications:** add mark-all-read endpoint ([dd01c26](https://github.com/ajbates93/trellis/commit/dd01c269cc313a4167d9c92757876e3cc4352929))
* **notifications:** add mark-read endpoint ([7c3640f](https://github.com/ajbates93/trellis/commit/7c3640fcba5f3a328a81eb2a7c144fb7f858ae4d))
* **notifications:** add NotificationsPopover component ([659d193](https://github.com/ajbates93/trellis/commit/659d193d6ee273ca70d7b8dd4bd399128fe74990))
* **notifications:** add shouldEmail helper ([3266d68](https://github.com/ajbates93/trellis/commit/3266d68ba3e4fd944f061f6551a995adf8cd5c52))
* **notifications:** add unread-count endpoint ([73e58a1](https://github.com/ajbates93/trellis/commit/73e58a1540c54a8800b193f919e27cd81c63416b))
* **notifications:** add useNotifications composable ([bb668b4](https://github.com/ajbates93/trellis/commit/bb668b4e211127eb947b4ea8596d31215a30d263))
* **notifications:** use shouldEmail + emit in-app notifications ([e4f8f3a](https://github.com/ajbates93/trellis/commit/e4f8f3a7948164f6ad7927bff7cd0128ec127129))
* **notifications:** wire bell + popover into sidebar ([0521b3e](https://github.com/ajbates93/trellis/commit/0521b3e23c369d3b53bcc3bb53104c224653a493))
* **reviews:** emit in-app review_reminder alongside emails ([30e29c6](https://github.com/ajbates93/trellis/commit/30e29c61c7d53cafbb38fead9429a379ee398c52))
* **reviews:** emit notification + email on review creation ([da911dd](https://github.com/ajbates93/trellis/commit/da911dd1c90896bcb4cb26a416b3574f2cb4a523))
* **reviews:** emit notifications + emails on reschedule/cancel/complete ([8cf5cce](https://github.com/ajbates93/trellis/commit/8cf5cceda1eb9c5a2c3b43cbf20848c34cc227d6))
* **schemas:** add notification API schemas ([8c8f13e](https://github.com/ajbates93/trellis/commit/8c8f13ecc54db77d5dc68872597c4e1eceb9c407))
* **settings:** per-category email preferences UI + API ([9a4dd8d](https://github.com/ajbates93/trellis/commit/9a4dd8d01986ccea673ac532e787a53688921199))


### Bug Fixes

* **auth:** drop stale emailNotifications client field ([5d1e21f](https://github.com/ajbates93/trellis/commit/5d1e21fca23919beabec818c90b3d7083d95562a))
* **notifications:** address Copilot review feedback ([24d2a33](https://github.com/ajbates93/trellis/commit/24d2a33fd5ae6909ae9d5d650a6c2acc9ca2102b))
* **notifications:** drop stale emailNotifications references and improve metadata ([3081ac2](https://github.com/ajbates93/trellis/commit/3081ac237241c165a4429463d9a876be65920a1f))
* **reviews:** guard newReview in notification emission ([1dea0cd](https://github.com/ajbates93/trellis/commit/1dea0cd508aeb1cc5242152a4fc1fec0c7abe24a))
* **schema:** add notifications relation to usersRelations ([b99f5ac](https://github.com/ajbates93/trellis/commit/b99f5acaa3413a2dc753c6729ae2487ff403f07c))
* **schemas:** use z.iso.datetime() for cursor types ([bef20a8](https://github.com/ajbates93/trellis/commit/bef20a8bae71a874f8d82597dc2bae3b8a6870e4))
* **test:** satisfy defineTask run signature in goal-reminders tests ([673bfa9](https://github.com/ajbates93/trellis/commit/673bfa9bbc1b861dbeb86d30c18fd95b4d9bad15))


### Refactoring

* **notifications:** clean up list endpoint validateQuery typing ([ee28e47](https://github.com/ajbates93/trellis/commit/ee28e47f4ea172acc7630385f336db41e55dca0d))


### Documentation

* add notifications implementation plan ([6cbfcfc](https://github.com/ajbates93/trellis/commit/6cbfcfc1be8d0747772620a45638e2a5599cb4d7))
* add notifications v1 design spec ([e107d08](https://github.com/ajbates93/trellis/commit/e107d08969dd83ac3b0125b8d0211c33b4cebe1d))


### Miscellaneous

* drop dashboard prototype files unrelated to notifications work ([cefff0f](https://github.com/ajbates93/trellis/commit/cefff0f86c7f458fce1e674a739f7b48200ee934))


### Tests

* **feedback:** assert published feedback notifies reviewees ([e59d3dc](https://github.com/ajbates93/trellis/commit/e59d3dc651f778005d582b9a67a92bd158d2a48d))

## [0.14.1](https://github.com/ajbates93/trellis/compare/v0.14.0...v0.14.1) (2026-05-05)


### Bug Fixes

* mobile settings access ([71f8bce](https://github.com/ajbates93/trellis/commit/71f8bce24641f5a67691442e6e7bc05ab42342dd))

## [0.14.0](https://github.com/ajbates93/trellis/compare/v0.13.0...v0.14.0) (2026-05-04)


### Features

* **api:** add PATCH /feedback/:id/favourite endpoint ([5b359fa](https://github.com/ajbates93/trellis/commit/5b359faffc2ff9e987dbe765476a946aa4222028))
* **api:** return isFavourite from /feedback/received ([d54527a](https://github.com/ajbates93/trellis/commit/d54527a03a0074c15bb4fca2750726b46e6f9143))
* **db:** add is_favourite column to feedback ([eb56a3b](https://github.com/ajbates93/trellis/commit/eb56a3bf644392e1008c9671e97526018dc74827))
* **feedback:** add FavouritesStrip component ([1fc73ea](https://github.com/ajbates93/trellis/commit/1fc73ea02bb922a33dc4fcbd618bb38ca2f190d0))
* **feedback:** add FavouriteToggle component ([bdf9d7a](https://github.com/ajbates93/trellis/commit/bdf9d7a3a6d098a7550c06da266e6ca6d0099df3))
* **feedback:** redesign modal header + add favourite toggle ([807f95b](https://github.com/ajbates93/trellis/commit/807f95b06fb5a409b60cec708e610f5fcceefdce))
* **feedback:** replace recent strip with favourites + add row star toggle ([7dea136](https://github.com/ajbates93/trellis/commit/7dea1368825dff92026334fec8e18bb0edb473c3))
* **schema:** add isFavourite to FeedbackWithReviewerSchema ([d493a51](https://github.com/ajbates93/trellis/commit/d493a51873c05893dd8289f2c4aa3d6f3ee1f5dc))
* **theme:** enable light mode with deeper emerald primary ([ec260b8](https://github.com/ajbates93/trellis/commit/ec260b8cdb5869818f0ce102f020f6ad1e8b388c))
* **theme:** light mode pass for dashboard ([9444f1e](https://github.com/ajbates93/trellis/commit/9444f1ef1ebddeb0731b0672737fef34e4c78a7c))


### Bug Fixes

* **api:** include isFavourite in buddy-received response ([d0030f3](https://github.com/ajbates93/trellis/commit/d0030f309d59f0ba20f8c302b8067d8dfb136df4))
* **api:** simplify favourite endpoint to inline body check ([eaf7a18](https://github.com/ajbates93/trellis/commit/eaf7a18254f38c861c5d56cfe9e79c0de7262a76))
* copilot comments ([b85b2b9](https://github.com/ajbates93/trellis/commit/b85b2b94b5eb0ed5eb17da61c026ce555db3cc20))
* **feedback:** outline star icons + sync modal on favourite toggle ([7826ed1](https://github.com/ajbates93/trellis/commit/7826ed1815357c402d24c25258634856ce119cae))
* **feedback:** stabilize favourites card layout ([3b72c28](https://github.com/ajbates93/trellis/commit/3b72c28aea195e9a6addcef9631c733e8adf6b53))
* **feedback:** trigger reactivity when toggling favourite locally ([fe88253](https://github.com/ajbates93/trellis/commit/fe88253d4653de9b3817291c3b296eaba73456d8))
* light mode on feedback give ([947a64a](https://github.com/ajbates93/trellis/commit/947a64a38e9b2db579c9858e64f24d555c1d924c))
* more give feedback updates ([4287ab6](https://github.com/ajbates93/trellis/commit/4287ab656f7196c40712ba61ee23535a5db3b45d))
* **theme:** improve light-mode contrast on brag bucket cards ([991174a](https://github.com/ajbates93/trellis/commit/991174a07a281f90d7501249badfb2321736bbef))
* **theme:** light-mode hero on review detail page ([b770286](https://github.com/ajbates93/trellis/commit/b7702861a979ed5c6878f7aa81c4f68ee195229f))
* **theme:** use rich emerald hero in light mode for review detail ([69a8e5f](https://github.com/ajbates93/trellis/commit/69a8e5f538bc2593d7628d079ebfb75082bad986))


### Documentation

* implementation plan for feedback favourites + modal redesign ([fc618ee](https://github.com/ajbates93/trellis/commit/fc618ee78c722ec395f6a452ed2fc1a10ed503ab))
* spec for feedback favourites + modal redesign ([d304602](https://github.com/ajbates93/trellis/commit/d3046026a6300dfcffa35ca33ac136dc11642880))

## [0.13.0](https://github.com/ajbates93/trellis/compare/v0.12.2...v0.13.0) (2026-04-25)


### Features

* **theme:** link dashboard components with app theme ([ad7e91f](https://github.com/ajbates93/trellis/commit/ad7e91ffdfe6fc1e6f6f0f2c43bb4bd80a85fc28))


### Bug Fixes

* revert to slate theme for now ([6f4af05](https://github.com/ajbates93/trellis/commit/6f4af05caa5bc4c6edc32f6cbbfc899cf029e674))

## [0.12.2](https://github.com/ajbates93/trellis/compare/v0.12.1...v0.12.2) (2026-04-17)


### Bug Fixes

* useAnnoucer correct apis ([419f562](https://github.com/ajbates93/trellis/commit/419f562cfa29acb6a9da1a507b4eab380eea2da4))

## [0.12.1](https://github.com/ajbates93/trellis/compare/v0.12.0...v0.12.1) (2026-04-16)


### Miscellaneous

* upadte package lock ([5d030c8](https://github.com/ajbates93/trellis/commit/5d030c87c0689e87334040e5a743af7ebffbd381))

## [0.12.0](https://github.com/ajbates93/trellis/compare/v0.11.0...v0.12.0) (2026-04-16)


### Features

* abort stale reflection autosaves ([9d9c014](https://github.com/ajbates93/trellis/commit/9d9c0141babe7717066c39ce05749f7582982425))
* add NuxtAnnouncer and announce silent buddy switches ([f011504](https://github.com/ajbates93/trellis/commit/f011504829d788f786b24c7d65a88dd45543da00))


### Bug Fixes

* pre-bundle icons for client-side navigation ([8c508dd](https://github.com/ajbates93/trellis/commit/8c508dd075551dfd43135b95169acb03fade1607))
* redirect non-admins to / with a toast instead of throwing ([d04da79](https://github.com/ajbates93/trellis/commit/d04da79262361f83996d856e4ab4f19a27950d7d))
* show submission date in feedback inbox + fix Slack install URL ([c3cd252](https://github.com/ajbates93/trellis/commit/c3cd25230f4d1a155075e18bf054a413c6db21bf))
* show submitted date in inbox not published ([2b78443](https://github.com/ajbates93/trellis/commit/2b78443c5b71249ff119a4540cab2d4333a916fa))
* typo ([3101042](https://github.com/ajbates93/trellis/commit/31010425d7c2306aa6656ad3656ea561be86ffbb))


### Refactoring

* add useApi composable, migrate /api/ callsites ([90b1d90](https://github.com/ajbates93/trellis/commit/90b1d909797ac253e0f1efe51d8a758ed2244f6b))
* use #server alias for imports within server/ ([666c474](https://github.com/ajbates93/trellis/commit/666c4740567f20caae8c5389a94257a13a04ff57))
* use route groups for admin page auth ([595a076](https://github.com/ajbates93/trellis/commit/595a07662686be3d85555cd9206203ac18890b46))


### Miscellaneous

* upgrade Nuxt to 4.4.2 ([c1815f2](https://github.com/ajbates93/trellis/commit/c1815f271806f73fe1ce8d296284bef8944c4641))

## [0.11.0](https://github.com/ajbates93/trellis/compare/v0.10.0...v0.11.0) (2026-04-11)


### Features

* **dashboard:** add activity feed endpoint (feedback-only MVP) ([0698fe0](https://github.com/ajbates93/trellis/commit/0698fe0d15dae93453f52c94dc298caa02120090))
* **dashboard:** add ActivityFeed component with relative timestamps ([fe62933](https://github.com/ajbates93/trellis/commit/fe6293383dde78b7e9c22988b986d87d76c558d1))
* **dashboard:** add BuddeeCard component with metrics and actions ([7d15b41](https://github.com/ajbates93/trellis/commit/7d15b4194e55bb806d59c56e6fd860a1d5791a6d))
* **dashboard:** add buddy dashboard summary endpoint ([d977c70](https://github.com/ajbates93/trellis/commit/d977c70bc2231b535d619c1e5789c18f46a96cf3))
* **dashboard:** add BuddySection with nudge bar and buddee cards ([7bee89e](https://github.com/ajbates93/trellis/commit/7bee89efd1b94465509a0ac967c37ab00b0dc967))
* **dashboard:** add DashboardHeader component with time-based greeting ([0ae4eef](https://github.com/ajbates93/trellis/commit/0ae4eef7ae2e091d775875303b22412d97ec02ce))
* **dashboard:** add feedback-pulse endpoint (12-week given/received) ([e9a1089](https://github.com/ajbates93/trellis/commit/e9a108936f5e9a143a42fba6513177a0b4069922))
* **dashboard:** add FeedbackPulse chart component (Unovis) ([728f78b](https://github.com/ajbates93/trellis/commit/728f78b7ae9af20dc2edf64fe7e27e1aab0e663c))
* **dashboard:** add feedbackStreak to stats endpoint ([64a122e](https://github.com/ajbates93/trellis/commit/64a122ed461dca5c54444abd75aeb0001354f738))
* **dashboard:** add FeedbackThemes component with sentiment bar ([aeb8bfb](https://github.com/ajbates93/trellis/commit/aeb8bfb4513a441e17d306927ab74708ea54caac))
* **dashboard:** add GoalProgress with milestone progress bars ([42f67f3](https://github.com/ajbates93/trellis/commit/42f67f307fd300504c5088a2d8af3f4269bc18e6))
* **dashboard:** add MiniStats component with conditional buddy stat ([79bcb52](https://github.com/ajbates93/trellis/commit/79bcb52bdd3fc11e92cd472b6fda39823d5cb2a8))
* **dashboard:** add QuickActions component with 3 action buttons ([1b72a1e](https://github.com/ajbates93/trellis/commit/1b72a1e7dc4d6cc1ae75812cb22635dcb5c33ee5))
* **dashboard:** add ReviewCountdown with prep checklist and circular progress ([1481ba5](https://github.com/ajbates93/trellis/commit/1481ba5b5289804a8bdf5b1f3028eb5932f00906))
* **dashboard:** add StreakBadge component with motivational states ([d3d0459](https://github.com/ajbates93/trellis/commit/d3d0459b645522caa9bc5b585ea4c094ac8cfbe9))
* **dashboard:** add Zod schema for buddy dashboard summary ([2546d82](https://github.com/ajbates93/trellis/commit/2546d823b7bd2245b5a201cf0e2e81f79c1eb0a2))
* **dashboard:** add Zod schemas for activity, feedback-pulse, and streak ([6145cd9](https://github.com/ajbates93/trellis/commit/6145cd9dfa4c186bf0e49f358b044c2f8c9f9c98))
* **dashboard:** deep-link buddy zone pages via ?buddy query param ([5636e7c](https://github.com/ajbates93/trellis/commit/5636e7c247086b29b84c25ad8a998d5aa506aaf4))
* **dashboard:** expand recent activity feed to all 6 event types ([3ef1a5a](https://github.com/ajbates93/trellis/commit/3ef1a5a98a33844fd8e3394deed68f57719eff52))
* **dashboard:** rewrite dashboard with new personalised layout (Phase 1) ([7bb9ddf](https://github.com/ajbates93/trellis/commit/7bb9ddf0b126ada81aa11dc9071e17d914b2d5a2))
* **dashboard:** wire ActivityFeed, FeedbackPulse, and StreakBadge into layout ([e1d830a](https://github.com/ajbates93/trellis/commit/e1d830a3656f2d9a7b8464e20a4654f8436db32f))
* **dashboard:** wire FeedbackThemes and BuddySection into layout ([7229025](https://github.com/ajbates93/trellis/commit/7229025d71a8c5cd23d3891f7b0fd7febb8b10a4))


### Bug Fixes

* activity fixes ([f6bd989](https://github.com/ajbates93/trellis/commit/f6bd989a7f8a5df541cd10863d2214fb1245ad14))
* copilot fixes ([7c405d8](https://github.com/ajbates93/trellis/commit/7c405d84626e4b1651e6713e1ec16e616d9344ac))
* **dashboard:** avoid v-html in BuddySection nudge messages ([e52f855](https://github.com/ajbates93/trellis/commit/e52f855648a11b4bb3b5043f60ae015577d70530))
* **dashboard:** extract theme labels from insight objects and add no-review empty state ([220d9ab](https://github.com/ajbates93/trellis/commit/220d9ab616e3f8db9de13161a067f683669ea7dd))
* **dashboard:** fix invalid Tailwind duration class and subtitle edge cases ([95e2289](https://github.com/ajbates93/trellis/commit/95e2289b208ccf43e8a44847188791f983ed899b))
* **dashboard:** refactor streak to single query with ISO week alignment ([b24aa65](https://github.com/ajbates93/trellis/commit/b24aa65fbf351aad9dd191846922743af378dd85))
* ssr blocking requests ([d8fedfe](https://github.com/ajbates93/trellis/commit/d8fedfec545d1aa619d1f2c0c396ffdfe8639fad))


### Refactoring

* **dashboard:** rename DashboardHeader to Header to avoid redundant prefix ([462cc90](https://github.com/ajbates93/trellis/commit/462cc90852b6facdef6a614300bfda6d2c4240d8))


### Documentation

* add git commit rules to CLAUDE.md (no co-authored-by) ([f8b0b39](https://github.com/ajbates93/trellis/commit/f8b0b398b38b622033a2c8cfe90b797a476bf856))
* implementation plan for buddy deep links and activity feed ([b9e5fc2](https://github.com/ajbates93/trellis/commit/b9e5fc2874ec9d97041619478e234317002c517c))
* spec for buddy deep links and full recent activity feed ([3b81819](https://github.com/ajbates93/trellis/commit/3b8181983ff8e952efd85316ef4201c8506c7a24))


### Tests

* **dashboard:** add 7th mockSelect for feedbackStreak query in stats tests ([1b0056e](https://github.com/ajbates93/trellis/commit/1b0056eddcd1612d1991d3fd97928f7dbd967ae2))

## [0.10.0](https://github.com/ajbates93/trellis/compare/v0.9.7...v0.10.0) (2026-04-10)


### Features

* add #actions slot to EmptyState component ([2572e56](https://github.com/ajbates93/trellis/commit/2572e568d803a86907a23b4b95a9fa5e6286df30))
* add Start Now and Schedule Review header buttons ([9407fd7](https://github.com/ajbates93/trellis/commit/9407fd742d7c51107b1f10a6e4b01203bcf11a51))
* add startReviewNow function to buddy reviews ([a10e4ce](https://github.com/ajbates93/trellis/commit/a10e4ceb2e127632e13d7c41d0c12fd1f4513e60))
* update empty states with Start Now + Schedule Review buttons ([652d26f](https://github.com/ajbates93/trellis/commit/652d26f55810c9aafad17023e81066d915a44ff2))


### Bug Fixes

* add goals button to post-review ([be10262](https://github.com/ajbates93/trellis/commit/be102627ac32c9758715e3e89ecece7cb73e447e))
* add spacing between description and actions slot in EmptyState ([4ca8b86](https://github.com/ajbates93/trellis/commit/4ca8b861dcbf0db7105630a55e0cf39859ac0f0e))
* add tiptap markdown extension for reviews ([1d0715e](https://github.com/ajbates93/trellis/commit/1d0715e939d6460c9414a0855532252f6cad1af1))
* allow same day reviews ([537b1fa](https://github.com/ajbates93/trellis/commit/537b1fa101d6bfb97b597308375c3b7aa36b8930))
* auto-show time picker when selecting date in review ([acf092c](https://github.com/ajbates93/trellis/commit/acf092c0821cf515df66d1121365179477074677))
* buddy and reviewee can edit all fields in review ([dfa0939](https://github.com/ajbates93/trellis/commit/dfa093981e5e10e08826ecd58e4c5d95e616a8d1))
* remove date validation entirely from reviews ([0758422](https://github.com/ajbates93/trellis/commit/075842271f7251db85151d3c0598c95d91eba686))
* simplify startReviewNow to use ISO string directly ([fdaa773](https://github.com/ajbates93/trellis/commit/fdaa773e1c873ef168abc4f93013f9cd3a7b50b6))
* use neutral color for Schedule Review buttons ([f09b20b](https://github.com/ajbates93/trellis/commit/f09b20b30c02a444015e3349e1b51c2f49c3d4d6))


### Documentation

* add design spec for Start Review Now (TRE-27) ([1eb9656](https://github.com/ajbates93/trellis/commit/1eb9656be9c64bf18ef680aa3919c1a6957cf029))
* add implementation plan for Start Review Now (TRE-27) ([efe04f0](https://github.com/ajbates93/trellis/commit/efe04f0c2654b11d816c409431e6051f4e138d06))


### Miscellaneous

* update gitignore ([9081134](https://github.com/ajbates93/trellis/commit/9081134dcaf0f90fab4d0f3259246c5721ced217))

## [0.9.7](https://github.com/ajbates93/trellis/compare/v0.9.6...v0.9.7) (2026-03-31)


### Bug Fixes

* navigation items ([0ddafc3](https://github.com/ajbates93/trellis/commit/0ddafc3d43d32be1cf02f968a53cecdf1620e01e))

## [0.9.6](https://github.com/ajbates93/trellis/compare/v0.9.5...v0.9.6) (2026-03-31)


### Bug Fixes

* convert landing into proper vue components ([12af24e](https://github.com/ajbates93/trellis/commit/12af24e77fc8949e7858a1e8f47a7db7ffcdf30f))
* formatting and fix quote ([84bfb85](https://github.com/ajbates93/trellis/commit/84bfb859db046dcbb48cade91949b909c1463666))
* initial landing vue component ([00a4beb](https://github.com/ajbates93/trellis/commit/00a4beb4aad011bbeba4cf886695c434a6a58f3c))

## [0.9.5](https://github.com/ajbates93/trellis/compare/v0.9.4...v0.9.5) (2026-03-22)


### Bug Fixes

* audit security critical and high priority fixes ([205b126](https://github.com/ajbates93/trellis/commit/205b1267bdb913098b247abab4961d9f491671da))
* repair tests with new workspace changes ([ed2e8b3](https://github.com/ajbates93/trellis/commit/ed2e8b3cc315735e3bdb65147d06c9aca0ef275e))

## [0.9.4](https://github.com/ajbates93/trellis/compare/v0.9.3...v0.9.4) (2026-03-06)


### Bug Fixes

* bug fixes ([#53](https://github.com/ajbates93/trellis/issues/53)) ([0b0eb9f](https://github.com/ajbates93/trellis/commit/0b0eb9f2b098e0e4481adbed34ee60e8af44485a))

## [0.9.3](https://github.com/ajbates93/trellis/compare/v0.9.2...v0.9.3) (2026-03-03)


### Bug Fixes

* add review breakdown section to admin reports ([75f6f94](https://github.com/ajbates93/trellis/commit/75f6f947ae7937a2b2e01837b68c72203198886e))

## [0.9.2](https://github.com/ajbates93/trellis/compare/v0.9.1...v0.9.2) (2026-02-27)


### Bug Fixes

* role label on scoreboard and drop unique pairs metric ([95fb3cc](https://github.com/ajbates93/trellis/commit/95fb3ccfbb5469b0b04431446a1b9375eb44df2b))

## [0.9.1](https://github.com/ajbates93/trellis/compare/v0.9.0...v0.9.1) (2026-02-27)


### Bug Fixes

* don't filter out zero-score users on leaderboard ([7be9dd0](https://github.com/ajbates93/trellis/commit/7be9dd0d89aae08f5e65f9c95aca7f02a448d815))

## [0.9.0](https://github.com/ajbates93/trellis/compare/v0.8.1...v0.9.0) (2026-02-27)


### Features

* community insights beta ([216013f](https://github.com/ajbates93/trellis/commit/216013fac1b35389e87ec2bcaf4e7169dd870973))

## [0.8.1](https://github.com/ajbates93/trellis/compare/v0.8.0...v0.8.1) (2026-02-25)


### Bug Fixes

* [TRE-12] reviews epic. Fixes TRE-6,7 & 8. Adds additional comments freeform textbox to reviews. Allow re-opening of completed reviews. ([#45](https://github.com/ajbates93/trellis/issues/45)) ([25779c8](https://github.com/ajbates93/trellis/commit/25779c83777c165ddb8b953c4522e6b904dd0cfc))

## [0.8.0](https://github.com/ajbates93/trellis/compare/v0.7.2...v0.8.0) (2026-02-24)


### Features

* add buddies page ([88768e5](https://github.com/ajbates93/trellis/commit/88768e5b0f2631bf8920110bb8de13c395d35755))
* add buddies page ([7d0a5b8](https://github.com/ajbates93/trellis/commit/7d0a5b83e814033741900705c1b6a537c526ed7e))
* add buddy goal checkins ([6a1dd56](https://github.com/ajbates93/trellis/commit/6a1dd567c3a67ec328ef722396079230a762bb8b))
* add coming soon pages and add unread indicator ([c4bd5e5](https://github.com/ajbates93/trellis/commit/c4bd5e5ab164e5a7ba67307778973c082f74283c))
* add debug ([635d13a](https://github.com/ajbates93/trellis/commit/635d13ac3cbc77d70ed85d2cccd0c025c4382184))
* add feedback-to-review linking system with automatic assignment ([b0ce418](https://github.com/ajbates93/trellis/commit/b0ce4181ca1c05d3e59acaf996490fe2152b995b))
* add log out ([7c2ab83](https://github.com/ajbates93/trellis/commit/7c2ab83df52181c933e81c99b0287c14a6a86a2b))
* add milestones to goals ([6cd4bd7](https://github.com/ajbates93/trellis/commit/6cd4bd7fdf011bbf13a6b128f317607b90dbfa19))
* add new zod types and schemas ([27f7c37](https://github.com/ajbates93/trellis/commit/27f7c37be4e9302270ac60de935441ad07da4c5d))
* add notes on multi tenancy ([326f5c1](https://github.com/ajbates93/trellis/commit/326f5c1ffeea565cb3afa036d6ac12adaa0bcb50))
* add plan for sentiment analysis ([a291fef](https://github.com/ajbates93/trellis/commit/a291fef8dd4312f0ba13184fdde111826ac0017f))
* add reporting suite for admins ([d6fb5e2](https://github.com/ajbates93/trellis/commit/d6fb5e20b7f062f252d6532d78c961eccc3dc5b1))
* add review reminder emails ([e5f4b6b](https://github.com/ajbates93/trellis/commit/e5f4b6bb48fc2ed5465048b7cb9acd8b6faf0481))
* add semantic versioning ([fc4963d](https://github.com/ajbates93/trellis/commit/fc4963d4aec3092dbca04b86448212f172555588))
* add semantic versioning ([31bad03](https://github.com/ajbates93/trellis/commit/31bad0361e2f2ce4e7d3396b73578c540a157dfc))
* add snaggd.io ([e671034](https://github.com/ajbates93/trellis/commit/e6710345c193c80a84edabb4ee8165adaa205b13))
* add some nice user linking stuff ([c9093ea](https://github.com/ajbates93/trellis/commit/c9093ea7f550fabec7913fc726932c5ab58f9643))
* add tests for api routes, add excludes, threshold data, release-please ci updates ([#35](https://github.com/ajbates93/trellis/issues/35)) ([30a404b](https://github.com/ajbates93/trellis/commit/30a404b944c54a835d35b4c757346b369c516a96))
* add time ([a5891ae](https://github.com/ajbates93/trellis/commit/a5891ae066feca1981d4c9d4472d8f149dd95e10))
* add tiptap editor for goal description. more CRUD operations for goals ([dfdad3d](https://github.com/ajbates93/trellis/commit/dfdad3d914bb00dc3d8bcb3c25afa296e0528e5a))
* add two sentiment analysis sections to admin dashboard ([bec3b26](https://github.com/ajbates93/trellis/commit/bec3b26e8e9c9b35a7e704322ddc8d3451814799))
* add user impersonation feature for admins ([d93400f](https://github.com/ajbates93/trellis/commit/d93400fb4ac8761e4e175c8f771a05b872d21f58))
* add user profile with s3 compatible storage ([8d65527](https://github.com/ajbates93/trellis/commit/8d65527ef6fa439b52c3ec3a257ae88b6cef15b8))
* add vitest and initial unit tests ([6df63c8](https://github.com/ajbates93/trellis/commit/6df63c86e5047e958e264e26328aa6fb1d98d430))
* admin endpoints ([cf5d3d0](https://github.com/ajbates93/trellis/commit/cf5d3d0ca17184dd7b1aeb0cbd11abded070ce10))
* auth changes ([f8b2b62](https://github.com/ajbates93/trellis/commit/f8b2b62c6fee3e11fa28f3b15b4a6243a268d984))
* better auth implementation ([2e60cd7](https://github.com/ajbates93/trellis/commit/2e60cd749a94e9045741509659533678eaa51627))
* better cli, pre-fil modal, success message ([9a4eef5](https://github.com/ajbates93/trellis/commit/9a4eef5161f091d6c41ae5d6e2fca27c586a7773))
* better design ([34efab0](https://github.com/ajbates93/trellis/commit/34efab09d81c30b58016d046a380e72baab0ab97))
* better impersonation ux ([1c7f8c5](https://github.com/ajbates93/trellis/commit/1c7f8c5d5efaee1c058ecac4661b633535fd331a))
* better visualisations ([c6188ed](https://github.com/ajbates93/trellis/commit/c6188ed6581b41905529b766d04d278df71c1227))
* big design overhaul to give feedback page ([6d1b972](https://github.com/ajbates93/trellis/commit/6d1b9729c82002ac982f390e812ccfd1c00ccbc8))
* buddy assignment fix ([b031ec3](https://github.com/ajbates93/trellis/commit/b031ec374a64059cc637216701e474c3dae365fb))
* complete overhaul of homepage with command palette ([758bcab](https://github.com/ajbates93/trellis/commit/758bcabf94e8e77140bf7e27dbff2c6f8643a74f))
* complete reviews UI with reassignment and detail pages ([33f3dc6](https://github.com/ajbates93/trellis/commit/33f3dc642c270c71eb03a9e293d292e693820075))
* component migration ([95eff82](https://github.com/ajbates93/trellis/commit/95eff825545b16f290f89a4f3a9014cf3e79ce28))
* create review functionality ([23daf03](https://github.com/ajbates93/trellis/commit/23daf03c2b23cecb92c59c3a312a5178c8366c6f))
* data visualisations ([3c8d7df](https://github.com/ajbates93/trellis/commit/3c8d7df0164ab2fabf4c0e64f06e3be3167833b2))
* display feedback on review pages ([e07d4fa](https://github.com/ajbates93/trellis/commit/e07d4fa9dbde12204c753ee14e17ffba2a4223b8))
* display unread buddy feedback and read modal ([92daa75](https://github.com/ajbates93/trellis/commit/92daa75d7e1937ebe1b0a74715a3950d952e66a0))
* email notifications emails ([ebe63d6](https://github.com/ajbates93/trellis/commit/ebe63d60f5a4dcc6288f40932214de1ec7e47796))
* email notifications emails ([21b0d64](https://github.com/ajbates93/trellis/commit/21b0d64069e51a2e1d9b1a3aba3bf8c7bcac3bd7))
* emphasise question helper a little more ([b14c852](https://github.com/ajbates93/trellis/commit/b14c85239cfef44ad4ad985971b372e9553ccb95))
* empty states for all pages ([1dca763](https://github.com/ajbates93/trellis/commit/1dca7633b6a10c20739a311cf2d0c26557c8a2a7))
* filter by buddy ([0e7a0c7](https://github.com/ajbates93/trellis/commit/0e7a0c73eec58161e3aa9ecb63cd166fb6a08179))
* final schema validation ([07444dc](https://github.com/ajbates93/trellis/commit/07444dcb67e7281b3c3a5ebfc4e382dcfb6e6097))
* first go at re-designing feedback submission ([44fba9b](https://github.com/ajbates93/trellis/commit/44fba9bb47a5b0a01e98e92eb94973605cf344cb))
* first nuxt ui implementation ([0133d61](https://github.com/ajbates93/trellis/commit/0133d617d144b2b7e22100f5604ab9006217111c))
* first pass at admin charts ([03816b9](https://github.com/ajbates93/trellis/commit/03816b95d03a50d0e1ad908487f24b9c80e2ef38))
* first pass at sentiment analysis with claude haiku ([8c5df42](https://github.com/ajbates93/trellis/commit/8c5df42501f97e5a82330f2245da9cab84ae68b2))
* forgot to commit ([99e1952](https://github.com/ajbates93/trellis/commit/99e1952297421f4dbced1efcce26ec377539ff01))
* give feedback ui and logic ([3195eb6](https://github.com/ajbates93/trellis/commit/3195eb6a41dfe19265b9ce730312c5b2ccfcdab0))
* goals implementation ([1ec31a3](https://github.com/ajbates93/trellis/commit/1ec31a31772350fc2333d9444874fff512647148))
* heading size increases ([3038a5a](https://github.com/ajbates93/trellis/commit/3038a5a0ced8588d182ef64d42aa343ca69aca10))
* homepage dashboard design ([bbacc4e](https://github.com/ajbates93/trellis/commit/bbacc4ee4a1714a56a539a68365301584c8da71d))
* implement better loading ux ([55fcd38](https://github.com/ajbates93/trellis/commit/55fcd3816bcd71b2a44869f3120ce2c2b5d2690d))
* implementation with railway and db init ([c59287d](https://github.com/ajbates93/trellis/commit/c59287dbb236950d107d0e4c4dc029e0452478b0))
* improve review card clarity by displaying reviewee name ([f54241c](https://github.com/ajbates93/trellis/commit/f54241cad584a37c2fab07c6625dccbdc35dca9b))
* improve review card clarity by displaying reviewee name ([34c0361](https://github.com/ajbates93/trellis/commit/34c03619086043c5ba31a23f7d9df68c24cdc8f6))
* initial brag bucket work / db, api etc. ([22009fe](https://github.com/ajbates93/trellis/commit/22009feebf5f7f4e6679fb21a9815c06a7662230))
* initial email password impl with account linking and manual password hashing ([352a1dd](https://github.com/ajbates93/trellis/commit/352a1dd39b9b03c31977594c3263f791c776d814))
* initial navigation rework ([514b584](https://github.com/ajbates93/trellis/commit/514b584e991ca7390c1bc6d64b52f44364f86ccc))
* lots more updates to review ui ([9313c3d](https://github.com/ajbates93/trellis/commit/9313c3d2a692599d2f88e2e07f4378cd6a2535a0))
* lots of minor updates around styling ([655ef51](https://github.com/ajbates93/trellis/commit/655ef513426aa089445fea8e2ae060db7cad2d4f))
* lots of updates around toasts and railway ([3b77708](https://github.com/ajbates93/trellis/commit/3b77708d2361af3ef7757eaed147807938295f44))
* migrate core feedback endpoints ([789346a](https://github.com/ajbates93/trellis/commit/789346abcc4bfba6db458bab6d4de625c668fe86))
* migrate core goals endpoints ([fbe655d](https://github.com/ajbates93/trellis/commit/fbe655d6ebb4f60bf588da8fed78492eb6358272))
* mobile fixes ([e63794a](https://github.com/ajbates93/trellis/commit/e63794ac18a930a0a691ccbabf670510bd492afa))
* mobile nav ([dca777c](https://github.com/ajbates93/trellis/commit/dca777c4a5d7e01393424d3cc6c81dcd473cc575))
* more text sizes ([08fde10](https://github.com/ajbates93/trellis/commit/08fde10bc796b3b83853691a2d03152d82512878))
* much nicer feedback submission UX ([9776c2d](https://github.com/ajbates93/trellis/commit/9776c2de7753b6657dd2c2fc936bc5e0cf25ba41))
* nicer ux for users with not enough feedback ([2976e69](https://github.com/ajbates93/trellis/commit/2976e69ff5b688a8a6a426709e81afc6fac2884f))
* page heads ([9cacc80](https://github.com/ajbates93/trellis/commit/9cacc80c8e646022e23dede595be962904396253))
* remove given column from buddy view of feedback table ([0a78074](https://github.com/ajbates93/trellis/commit/0a78074012e8e71eef6f7f78f61cc6c2d96ffb26))
* remove outdated feedback / review assignment ([481731b](https://github.com/ajbates93/trellis/commit/481731b56cdbb1e58160f51f5cabb198553205c4))
* remove passthroughs and fix buddies / users lists ([3853bdd](https://github.com/ajbates93/trellis/commit/3853bddfafffb4b12db164dc4d49fd306a44ac73))
* rename to trellis ([c152622](https://github.com/ajbates93/trellis/commit/c152622070554aaccd27160a0bc63808b79847f5))
* reviews reflections ([04663b6](https://github.com/ajbates93/trellis/commit/04663b61d190c932f12a5e95a77d7fb20283e700))
* send feedback form readability ([d1eba23](https://github.com/ajbates93/trellis/commit/d1eba23fa0f24643d3a9fff62b284b8f7ec17f67))
* sentry integration ([032705c](https://github.com/ajbates93/trellis/commit/032705c2f7f1c5b57b93661912e5f3e3488c9e17))
* settings pages ([650073d](https://github.com/ajbates93/trellis/commit/650073dd6446a2ecd0aed533a0c1a9dca4077c3a))
* slack integration ([8468536](https://github.com/ajbates93/trellis/commit/846853676b7fd7d091ac9558c4923a066c05afc7))
* small tweaks ([35146a4](https://github.com/ajbates93/trellis/commit/35146a4fd33ae447f183035902c0e2e795643410))
* some validation improvements ([978fe10](https://github.com/ajbates93/trellis/commit/978fe100426225414dc2bc2b1ac0e0b042f5344e))
* spotlight feedback items ([8780841](https://github.com/ajbates93/trellis/commit/87808417b917134f285ef01b4f1488cc17dab3d6))
* staging env setup ([09be93e](https://github.com/ajbates93/trellis/commit/09be93ece2b96fcc46cb6b8aabbbc8b7d0761991))
* start adding feedback page ui ([4c41cbe](https://github.com/ajbates93/trellis/commit/4c41cbee4461b2177495ac62c3caae76f7a430b1))
* start adding feedback system with db seeding ([3dfe445](https://github.com/ajbates93/trellis/commit/3dfe445adb32ff21b6cae6b1054a66571045daad))
* start adding more settings pages ([9917928](https://github.com/ajbates93/trellis/commit/9917928db3a5cf66bd1ce984edc8319c0f5aeabf))
* switch to snaggd async loader ([6a0cccd](https://github.com/ajbates93/trellis/commit/6a0cccde30a1440a0cd2c33463f468d869a294af))
* timeline upgrades and move link location in navigation. ([50a907c](https://github.com/ajbates93/trellis/commit/50a907c3d638508c1151e028da9d856b547eec8e))
* user management and csv upload ([627a5be](https://github.com/ajbates93/trellis/commit/627a5be7d48713710b02d04bfc39555a5f5b6b06))
* useState for retaining selected buddy ([dd02b02](https://github.com/ajbates93/trellis/commit/dd02b023482f85d211ff902791d6c7fa23b1ff8c))
* visual updates to goals ([32e7434](https://github.com/ajbates93/trellis/commit/32e7434ff16f2646781c876f3bc867570dc9f86d))
* wizard tasks ([c1cfe25](https://github.com/ajbates93/trellis/commit/c1cfe252a5da488be358009b3665747587147697))
* workspaces ([3941f73](https://github.com/ajbates93/trellis/commit/3941f7369a272efee0388c291a5aa636033affb2))
* zod schema ([c545f43](https://github.com/ajbates93/trellis/commit/c545f43004b4427f47aa5855230ef4c30b234900))


### Bug Fixes

* a couple of UI fixes ([3e1e77d](https://github.com/ajbates93/trellis/commit/3e1e77d44df6e3a4f70289650d88e3ae2524769c))
* add 'management' as option ([432a91b](https://github.com/ajbates93/trellis/commit/432a91b98e9084742c4cb7b2c0c08b13971da0bc))
* add close button for mobile nav ([3fea5cd](https://github.com/ajbates93/trellis/commit/3fea5cddccfa5b16855a2da327788c2d0626fcc3))
* add growth as roletype in schemas ([dba92fe](https://github.com/ajbates93/trellis/commit/dba92fecf8453765561624f0dcb852cead5aadc6))
* add integration utility helpers ([c1d7c7b](https://github.com/ajbates93/trellis/commit/c1d7c7bdea2aebaaa173d90d5208ad65116e29d1))
* add slack integrations to public routes ([8563227](https://github.com/ajbates93/trellis/commit/8563227e767eb4b238c238998f2eae3895193378))
* add write permissions to workflow ([ee443d5](https://github.com/ajbates93/trellis/commit/ee443d589a2d34e29840d874a42f8d8e42958fd2))
* assign feedback to reviews for buddy ([cbf0352](https://github.com/ajbates93/trellis/commit/cbf03523887509c68d1baa88787662c3e95b24d8))
* auth theme ([81cb7b2](https://github.com/ajbates93/trellis/commit/81cb7b221155e437481a444b7f1e0a89f3d2e2f0))
* better check-ins UI ([ec357a0](https://github.com/ajbates93/trellis/commit/ec357a040375a95902f114bd1dda40e9c01127db))
* better deploy ([5c4e567](https://github.com/ajbates93/trellis/commit/5c4e567756abf57c877fdb0d47d5fea06b7acac0))
* better logging in slack util ([3efea91](https://github.com/ajbates93/trellis/commit/3efea91c0b22b4f8180160c6184631c885ca14a7))
* better start/stop impersonation ([acb9cdc](https://github.com/ajbates93/trellis/commit/acb9cdcc6b749ea924220d2cb9014460de610356))
* better tabs ([82d5a03](https://github.com/ajbates93/trellis/commit/82d5a0350b2f8e78bb88e0509f1a9b88b35cc22f))
* buddy assignment on user creation ([07b7c7e](https://github.com/ajbates93/trellis/commit/07b7c7e782f3f5f0beac61e24b328d5470277d8c))
* bug around worksapces ([ccbc5b7](https://github.com/ajbates93/trellis/commit/ccbc5b725aafdc1ca971fa87e96fcbc55491d42a))
* bug fixes ([7c2b4c5](https://github.com/ajbates93/trellis/commit/7c2b4c5269ff2a08b1dc6fa62fd4ea6f72704e37))
* clear query params ([e639ea5](https://github.com/ajbates93/trellis/commit/e639ea57397c41650c96de8ed658d67e15c7c820))
* dashboard mobile ([39e814c](https://github.com/ajbates93/trellis/commit/39e814cef82a5be3c117154b97144a2a5d1b358e))
* display value in dropdowns ([86657be](https://github.com/ajbates93/trellis/commit/86657be43b641bcb93d0628b650914b0957dd919))
* don't omit optional deps ([871aec2](https://github.com/ajbates93/trellis/commit/871aec2eb96fe418f29a9b9adda0920cc8f02a66))
* don't validate unused body mark as read ([a22c249](https://github.com/ajbates93/trellis/commit/a22c249689c7826a6c4627e1ca766203edc9c4e6))
* dropdown options in admin ([c4c19ed](https://github.com/ajbates93/trellis/commit/c4c19eda941978375099d6c9f196df332598b068))
* empty states and response shape ([e778cb0](https://github.com/ajbates93/trellis/commit/e778cb009562becef6796dc86ef34ed1a1dbb58d))
* enable debug on snaggd ([2704e88](https://github.com/ajbates93/trellis/commit/2704e88c310bfc3df81113bb9d64f0b0858af348))
* eslint errors ([8503933](https://github.com/ajbates93/trellis/commit/8503933c76a10d59d85953d572e70f0d4a4d6b8e))
* feedback max length 5000 -&gt; 3000 ([80c5545](https://github.com/ajbates93/trellis/commit/80c55458765f73b5a68d9d0088f7e8b1b80abd10))
* force dark mode ([088a7bd](https://github.com/ajbates93/trellis/commit/088a7bdc9fbb8a6386eb8f9dcad67c9d5530f716))
* forgot to commit scheduled task for review reminders ([462a939](https://github.com/ajbates93/trellis/commit/462a9399a76d96f9e31d0d88543fce1638c89c4e))
* forgot to remove test isImpersonating ([2532b07](https://github.com/ajbates93/trellis/commit/2532b07e2910decdf6c409b04268d0ddac39e539))
* further name matching ([a4e8034](https://github.com/ajbates93/trellis/commit/a4e803492592c704590966486c7fb107daf1acce))
* handle existing tags in Github release workflow ([352f784](https://github.com/ajbates93/trellis/commit/352f7847d100cb8402adb12232a422b1efddb2f1))
* hide buddy pages in mobile ([925f202](https://github.com/ajbates93/trellis/commit/925f202c3ec78039ebc34d0630995a39e3406d58))
* homepage stats and review achievements icon ([54711f1](https://github.com/ajbates93/trellis/commit/54711f1ab8778f3f5c89d561f4b34d32b27f30dc))
* input formatting ([a152503](https://github.com/ajbates93/trellis/commit/a1525038eeb1fb53deeb62a9829cff1d1872d61a))
* lint ([dbe03f0](https://github.com/ajbates93/trellis/commit/dbe03f07f26dda2cdef1273111e89a6de7cb2e9d))
* lint ([94e6973](https://github.com/ajbates93/trellis/commit/94e6973e28ebf6f625713c75fc37b8af5c06f07c))
* lint ([28809a8](https://github.com/ajbates93/trellis/commit/28809a887c4c268f31461944433e48d69618930c))
* lint ([3ca2ea9](https://github.com/ajbates93/trellis/commit/3ca2ea968508bc0c3d02306db12db193f1a0d9c7))
* lint ([9078094](https://github.com/ajbates93/trellis/commit/907809432927cfc3ffa224a74395845d39d55128))
* lots of fixes for reviews ([ce196c2](https://github.com/ajbates93/trellis/commit/ce196c2130029d25fb2fc1f785020223c9b53578))
* lots of little snags ([61f30fe](https://github.com/ajbates93/trellis/commit/61f30fe364130af3e86a00a0b7dc5330a7024fb1))
* lots of npx typecheck fixes ([00e6f24](https://github.com/ajbates93/trellis/commit/00e6f24d60173d27028fd3e3ce68b9140e99b99f))
* lots of npx typecheck fixes ([954e848](https://github.com/ajbates93/trellis/commit/954e84874e8da5ec3b4d4fb29e36172bb2ecf693))
* mark as read action ([0ca7838](https://github.com/ajbates93/trellis/commit/0ca78381519ac0da917b1352f7935bdd5bb36a55))
* mobile avatar ([2beecc2](https://github.com/ajbates93/trellis/commit/2beecc219726e91cb6190f2b25123e18d52dd051))
* mobile content padding ([984d510](https://github.com/ajbates93/trellis/commit/984d510ff3f9e81e8980c4b531147c5968edf47d))
* modal fix ([49f5fcf](https://github.com/ajbates93/trellis/commit/49f5fcfafd964dfaaaf507b79aa7317e1dcc8867))
* more auth fix ([45b5066](https://github.com/ajbates93/trellis/commit/45b5066e0cd071b78029a24eaaabee4980364d2b))
* more eslint ([486c76c](https://github.com/ajbates93/trellis/commit/486c76cfed4f389033bbc994bb6c359dd929b0e8))
* move create review logic to buddy section ([d07a1f0](https://github.com/ajbates93/trellis/commit/d07a1f03e312c0687f9f2182818acf835717578b))
* nixpack fixes ([aff340d](https://github.com/ajbates93/trellis/commit/aff340db26ca18b12b7a45adc073381e05c835c9))
* normalise name ([14ea788](https://github.com/ajbates93/trellis/commit/14ea788b9a7d4204a453ee51d92a79d4af40d220))
* notes ([ef8ec1c](https://github.com/ajbates93/trellis/commit/ef8ec1c79bed103511ef891168902297353d419d))
* nvim stuff ([1365dbc](https://github.com/ajbates93/trellis/commit/1365dbce2c10ca58d11e0455a68cda444825faf5))
* padding on mobile and tablet ([50119c9](https://github.com/ajbates93/trellis/commit/50119c9034bd50b9e0a77d4584d361f580627fc6))
* profile button fixes ([333cefd](https://github.com/ajbates93/trellis/commit/333cefd939a282bcb6d4eabfe2d4d2445e1d3293))
* regenerate migrations and improve CI/CD error handling ([d8a257c](https://github.com/ajbates93/trellis/commit/d8a257cc55db0a77073f487e2328e9a27794ae3a))
* regex fix ([8ee46e8](https://github.com/ajbates93/trellis/commit/8ee46e82c569c86022a4ab94bf80e2633b6ca92f))
* remove animations from feedback give page ([4445cf9](https://github.com/ajbates93/trellis/commit/4445cf901f05ea888aa4999bb2725732fcdfd5a6))
* remove duplicate migration files that were never applied ([fcffcc0](https://github.com/ajbates93/trellis/commit/fcffcc0c7b3c197b7fc93d263664ca99c828027f))
* remove emdash ([a2f7293](https://github.com/ajbates93/trellis/commit/a2f7293d72cc039dc0c0d0d0e382c4e6a45a07f5))
* remove requirement for pocketworks email ([8c1ccce](https://github.com/ajbates93/trellis/commit/8c1ccce61a17267aab7b94152fb3cc2d783456d3))
* remove slack team info ([b9c694f](https://github.com/ajbates93/trellis/commit/b9c694ff4b2ed7baba22d857a2545dc54548e265))
* response handling, edit and delete reviews, formatting ([d4a2ac9](https://github.com/ajbates93/trellis/commit/d4a2ac9b46376d1bc79b2413c73d7780cd5a2a1e))
* response shape ([89cf285](https://github.com/ajbates93/trellis/commit/89cf285c5d8b4316a93e82a0d7ab308fe75ec9c6))
* return empty response ([d41f5a0](https://github.com/ajbates93/trellis/commit/d41f5a0531a5c551cac244c502e30caabfe3675a))
* review achievments fix ([fadec8a](https://github.com/ajbates93/trellis/commit/fadec8ae7e7ef7c8443dec2db140a016bfd9502c))
* review goals achievments filtering ([3cb1162](https://github.com/ajbates93/trellis/commit/3cb1162e205d49e221513f5fea8ec2aff5f5c154))
* review reminders ([575f704](https://github.com/ajbates93/trellis/commit/575f704950fdaf24ec164902ac177b4dd9f96824))
* review reminders ([b700a2b](https://github.com/ajbates93/trellis/commit/b700a2bc5833760008b316395d478c7ef1ea0126))
* reviews pages initial work ([0c23707](https://github.com/ajbates93/trellis/commit/0c23707e568bb427bd76c1ded8b65be2fc1d8385))
* reviews UI ([7f6d688](https://github.com/ajbates93/trellis/commit/7f6d688eceaaed99e3d45405218b28526c6e6a2a))
* rework nav to be submit feedback / feedback ([dbe93bc](https://github.com/ajbates93/trellis/commit/dbe93bc3e0cf4e8615cd364bceaf969a9b4eeaa7))
* scrolling and chip -&gt; badge ([8ddcdaf](https://github.com/ajbates93/trellis/commit/8ddcdaf2df7e88dc21d9b6ff48820a722ad1ff4d))
* select menu width ([4416ba2](https://github.com/ajbates93/trellis/commit/4416ba20649342a2c899579dfbb68185fe668482))
* sentiment total rounding ([5cc4c30](https://github.com/ajbates93/trellis/commit/5cc4c30d78d094920bf1036cfdbcd09734c47baf))
* sentry release ([c7336dc](https://github.com/ajbates93/trellis/commit/c7336dc184634b7326cf83365929b5d804a3301e))
* simplify ([8b05512](https://github.com/ajbates93/trellis/commit/8b05512779be55323a364e4b0329e4fd29feab38))
* some dashboard improvements ([ee448cd](https://github.com/ajbates93/trellis/commit/ee448cdebd764fce9332090e46a48eeddcf85aeb))
* some implementation bugs. add refresh after user feedback analysed. ([5a4ad68](https://github.com/ajbates93/trellis/commit/5a4ad6815180faa36a41cda65a8a3bd22fa9c619))
* timezone bug ([b848d6c](https://github.com/ajbates93/trellis/commit/b848d6c42e2bd202b5a3b74f1298b97091b378c0))
* TRELLIS-5 bug fix (date resolution) ([#39](https://github.com/ajbates93/trellis/issues/39)) ([ecf0bfe](https://github.com/ajbates93/trellis/commit/ecf0bfe5dc9d587ff4a079bd5451adf663a7ef41))
* try better name matching ([717f04d](https://github.com/ajbates93/trellis/commit/717f04d7400b10b1399bc1f274a283fa72833791))
* try this ([dd962ae](https://github.com/ajbates93/trellis/commit/dd962aeee3c00facb541d90a84301e902841e77c))
* ts fix ([25d68a7](https://github.com/ajbates93/trellis/commit/25d68a7bd94615fbd0ec2160feaf46f09d5a090f))
* type error ([057ed29](https://github.com/ajbates93/trellis/commit/057ed2906cb7f7d773bf8619d6fd4648f53e124e))
* ui ([d224ebb](https://github.com/ajbates93/trellis/commit/d224ebbd23a109879401f4884ca5382b0c0af373))
* ui updates to other tabs ([f6289d9](https://github.com/ajbates93/trellis/commit/f6289d928f9c5c1667457eee57bd862642e20ef1))
* upcoming reviews change email subject ([#37](https://github.com/ajbates93/trellis/issues/37)) ([27437e5](https://github.com/ajbates93/trellis/commit/27437e5d16f30afbb41622262475a984e3dc509b))
* update buddies goals page to use new tab format. ([58187c7](https://github.com/ajbates93/trellis/commit/58187c70edd84c34c0a28af8568c1b610437e02b))
* update charting libraries ([478318d](https://github.com/ajbates93/trellis/commit/478318dab8ac35267441e6a520e7ba7acc0b6d3d))
* update readme ([2f3d91e](https://github.com/ajbates93/trellis/commit/2f3d91ea0faad98f4900423ca3fb8fe9a503d33e))
* update session expiry to 30 days and refresh if older than 7 for active users ([0605e85](https://github.com/ajbates93/trellis/commit/0605e8560be85d7266859b34fbbb3af789216aa7))
* update to submit feedback in text ([caef4ac](https://github.com/ajbates93/trellis/commit/caef4ac25a204ecac15e511ee6aa3486139d7ac2))
* ux improvements for reviews ([635c02c](https://github.com/ajbates93/trellis/commit/635c02c1fde3457a2e7a050e0cdaaf20a795e3e2))


### Refactoring

* add composable for reviews ([fadc0ba](https://github.com/ajbates93/trellis/commit/fadc0ba38dc4c53a9a167e25b222fad345fddd51))
* create review cards components ([6fc7888](https://github.com/ajbates93/trellis/commit/6fc7888af2d0650800ce97b21494ff945e0297dc))
* move question generator into help column ([c19fbab](https://github.com/ajbates93/trellis/commit/c19fbabf86215585ba22783415d2dae6dad47096))


### Documentation

* add workspace model multi-tenancy architecture documentation ([79f3422](https://github.com/ajbates93/trellis/commit/79f34228a205aeda14e6a579162c4e2b2e1e7634))


### Miscellaneous

* clean up logging ([7e82992](https://github.com/ajbates93/trellis/commit/7e829921e27961b6336ef83269473842ff4c814f))
* docs ([47247c4](https://github.com/ajbates93/trellis/commit/47247c43467741dffd86a2b08a3e00a5d4d3049b))
* forgot to commit package.json ([8423e17](https://github.com/ajbates93/trellis/commit/8423e1759190a019dea68cba9814dfc33d5edfdf))
* **main:** release cohort 0.7.0 ([e04be2f](https://github.com/ajbates93/trellis/commit/e04be2fab0fa6d9a35980f2e49c5de0ca808814f))
* **main:** release cohort 0.7.0 ([d14a46e](https://github.com/ajbates93/trellis/commit/d14a46e33436465b038e0c14e3342c589606903a))
* **main:** release cohort 0.7.1 ([d033a55](https://github.com/ajbates93/trellis/commit/d033a55c789a3a6548f016b04c067fc25ac95dd2))
* **main:** release cohort 0.7.1 ([be08ecb](https://github.com/ajbates93/trellis/commit/be08ecb6b755de47cf1bccd02708d9bd09bc9400))
* **main:** release cohort 0.7.2 ([8b7eb7c](https://github.com/ajbates93/trellis/commit/8b7eb7cdc5b5984fbf2ba2a56f9fac47eeaf51f7))
* **main:** release cohort 0.7.2 ([ee67b13](https://github.com/ajbates93/trellis/commit/ee67b1308e0a311ff18d839f946c73bfc6993845))
* password cleanup ([b75cf62](https://github.com/ajbates93/trellis/commit/b75cf6297d97db5b13e334b09d7e1b3562579a35))
* remove logging ([e2433da](https://github.com/ajbates93/trellis/commit/e2433da4b22ec6d46846ff83bf0b11b6cfab0753))
* rename cohort -&gt; trellis ([7d8e581](https://github.com/ajbates93/trellis/commit/7d8e581022df53f20a6334664875b22871232f4b))
* sync package-lock.json ([e7fadff](https://github.com/ajbates93/trellis/commit/e7fadff3a974a48711650e23cacb62da6a39f326))
* update development plan ([8bd9d78](https://github.com/ajbates93/trellis/commit/8bd9d78094e3d58a73a5b51eaf3d49dd2d6a7db9))

## [0.7.2](https://github.com/ajbates93/trellis/compare/cohort-v0.7.1...cohort-v0.7.2) (2026-02-24)


### Bug Fixes

* TRELLIS-5 bug fix (date resolution) ([#39](https://github.com/ajbates93/trellis/issues/39)) ([ecf0bfe](https://github.com/ajbates93/trellis/commit/ecf0bfe5dc9d587ff4a079bd5451adf663a7ef41))

## [0.7.1](https://github.com/ajbates93/trellis/compare/cohort-v0.7.0...cohort-v0.7.1) (2026-02-19)


### Miscellaneous

* sync package-lock.json ([e7fadff](https://github.com/ajbates93/trellis/commit/e7fadff3a974a48711650e23cacb62da6a39f326))

## [0.7.0](https://github.com/ajbates93/trellis/compare/cohort-v0.6.2...cohort-v0.7.0) (2026-02-19)


### Features

* add buddies page ([88768e5](https://github.com/ajbates93/trellis/commit/88768e5b0f2631bf8920110bb8de13c395d35755))
* add buddies page ([7d0a5b8](https://github.com/ajbates93/trellis/commit/7d0a5b83e814033741900705c1b6a537c526ed7e))
* add buddy goal checkins ([6a1dd56](https://github.com/ajbates93/trellis/commit/6a1dd567c3a67ec328ef722396079230a762bb8b))
* add coming soon pages and add unread indicator ([c4bd5e5](https://github.com/ajbates93/trellis/commit/c4bd5e5ab164e5a7ba67307778973c082f74283c))
* add debug ([635d13a](https://github.com/ajbates93/trellis/commit/635d13ac3cbc77d70ed85d2cccd0c025c4382184))
* add feedback-to-review linking system with automatic assignment ([b0ce418](https://github.com/ajbates93/trellis/commit/b0ce4181ca1c05d3e59acaf996490fe2152b995b))
* add log out ([7c2ab83](https://github.com/ajbates93/trellis/commit/7c2ab83df52181c933e81c99b0287c14a6a86a2b))
* add milestones to goals ([6cd4bd7](https://github.com/ajbates93/trellis/commit/6cd4bd7fdf011bbf13a6b128f317607b90dbfa19))
* add new zod types and schemas ([27f7c37](https://github.com/ajbates93/trellis/commit/27f7c37be4e9302270ac60de935441ad07da4c5d))
* add notes on multi tenancy ([326f5c1](https://github.com/ajbates93/trellis/commit/326f5c1ffeea565cb3afa036d6ac12adaa0bcb50))
* add plan for sentiment analysis ([a291fef](https://github.com/ajbates93/trellis/commit/a291fef8dd4312f0ba13184fdde111826ac0017f))
* add reporting suite for admins ([d6fb5e2](https://github.com/ajbates93/trellis/commit/d6fb5e20b7f062f252d6532d78c961eccc3dc5b1))
* add review reminder emails ([e5f4b6b](https://github.com/ajbates93/trellis/commit/e5f4b6bb48fc2ed5465048b7cb9acd8b6faf0481))
* add semantic versioning ([fc4963d](https://github.com/ajbates93/trellis/commit/fc4963d4aec3092dbca04b86448212f172555588))
* add semantic versioning ([31bad03](https://github.com/ajbates93/trellis/commit/31bad0361e2f2ce4e7d3396b73578c540a157dfc))
* add snaggd.io ([e671034](https://github.com/ajbates93/trellis/commit/e6710345c193c80a84edabb4ee8165adaa205b13))
* add some nice user linking stuff ([c9093ea](https://github.com/ajbates93/trellis/commit/c9093ea7f550fabec7913fc726932c5ab58f9643))
* add tests for api routes, add excludes, threshold data, release-please ci updates ([#35](https://github.com/ajbates93/trellis/issues/35)) ([30a404b](https://github.com/ajbates93/trellis/commit/30a404b944c54a835d35b4c757346b369c516a96))
* add time ([a5891ae](https://github.com/ajbates93/trellis/commit/a5891ae066feca1981d4c9d4472d8f149dd95e10))
* add tiptap editor for goal description. more CRUD operations for goals ([dfdad3d](https://github.com/ajbates93/trellis/commit/dfdad3d914bb00dc3d8bcb3c25afa296e0528e5a))
* add two sentiment analysis sections to admin dashboard ([bec3b26](https://github.com/ajbates93/trellis/commit/bec3b26e8e9c9b35a7e704322ddc8d3451814799))
* add user impersonation feature for admins ([d93400f](https://github.com/ajbates93/trellis/commit/d93400fb4ac8761e4e175c8f771a05b872d21f58))
* add user profile with s3 compatible storage ([8d65527](https://github.com/ajbates93/trellis/commit/8d65527ef6fa439b52c3ec3a257ae88b6cef15b8))
* add vitest and initial unit tests ([6df63c8](https://github.com/ajbates93/trellis/commit/6df63c86e5047e958e264e26328aa6fb1d98d430))
* admin endpoints ([cf5d3d0](https://github.com/ajbates93/trellis/commit/cf5d3d0ca17184dd7b1aeb0cbd11abded070ce10))
* auth changes ([f8b2b62](https://github.com/ajbates93/trellis/commit/f8b2b62c6fee3e11fa28f3b15b4a6243a268d984))
* better auth implementation ([2e60cd7](https://github.com/ajbates93/trellis/commit/2e60cd749a94e9045741509659533678eaa51627))
* better cli, pre-fil modal, success message ([9a4eef5](https://github.com/ajbates93/trellis/commit/9a4eef5161f091d6c41ae5d6e2fca27c586a7773))
* better design ([34efab0](https://github.com/ajbates93/trellis/commit/34efab09d81c30b58016d046a380e72baab0ab97))
* better impersonation ux ([1c7f8c5](https://github.com/ajbates93/trellis/commit/1c7f8c5d5efaee1c058ecac4661b633535fd331a))
* better visualisations ([c6188ed](https://github.com/ajbates93/trellis/commit/c6188ed6581b41905529b766d04d278df71c1227))
* big design overhaul to give feedback page ([6d1b972](https://github.com/ajbates93/trellis/commit/6d1b9729c82002ac982f390e812ccfd1c00ccbc8))
* buddy assignment fix ([b031ec3](https://github.com/ajbates93/trellis/commit/b031ec374a64059cc637216701e474c3dae365fb))
* complete overhaul of homepage with command palette ([758bcab](https://github.com/ajbates93/trellis/commit/758bcabf94e8e77140bf7e27dbff2c6f8643a74f))
* complete reviews UI with reassignment and detail pages ([33f3dc6](https://github.com/ajbates93/trellis/commit/33f3dc642c270c71eb03a9e293d292e693820075))
* component migration ([95eff82](https://github.com/ajbates93/trellis/commit/95eff825545b16f290f89a4f3a9014cf3e79ce28))
* create review functionality ([23daf03](https://github.com/ajbates93/trellis/commit/23daf03c2b23cecb92c59c3a312a5178c8366c6f))
* data visualisations ([3c8d7df](https://github.com/ajbates93/trellis/commit/3c8d7df0164ab2fabf4c0e64f06e3be3167833b2))
* display feedback on review pages ([e07d4fa](https://github.com/ajbates93/trellis/commit/e07d4fa9dbde12204c753ee14e17ffba2a4223b8))
* display unread buddy feedback and read modal ([92daa75](https://github.com/ajbates93/trellis/commit/92daa75d7e1937ebe1b0a74715a3950d952e66a0))
* email notifications emails ([ebe63d6](https://github.com/ajbates93/trellis/commit/ebe63d60f5a4dcc6288f40932214de1ec7e47796))
* email notifications emails ([21b0d64](https://github.com/ajbates93/trellis/commit/21b0d64069e51a2e1d9b1a3aba3bf8c7bcac3bd7))
* emphasise question helper a little more ([b14c852](https://github.com/ajbates93/trellis/commit/b14c85239cfef44ad4ad985971b372e9553ccb95))
* empty states for all pages ([1dca763](https://github.com/ajbates93/trellis/commit/1dca7633b6a10c20739a311cf2d0c26557c8a2a7))
* filter by buddy ([0e7a0c7](https://github.com/ajbates93/trellis/commit/0e7a0c73eec58161e3aa9ecb63cd166fb6a08179))
* final schema validation ([07444dc](https://github.com/ajbates93/trellis/commit/07444dcb67e7281b3c3a5ebfc4e382dcfb6e6097))
* first go at re-designing feedback submission ([44fba9b](https://github.com/ajbates93/trellis/commit/44fba9bb47a5b0a01e98e92eb94973605cf344cb))
* first nuxt ui implementation ([0133d61](https://github.com/ajbates93/trellis/commit/0133d617d144b2b7e22100f5604ab9006217111c))
* first pass at admin charts ([03816b9](https://github.com/ajbates93/trellis/commit/03816b95d03a50d0e1ad908487f24b9c80e2ef38))
* first pass at sentiment analysis with claude haiku ([8c5df42](https://github.com/ajbates93/trellis/commit/8c5df42501f97e5a82330f2245da9cab84ae68b2))
* forgot to commit ([99e1952](https://github.com/ajbates93/trellis/commit/99e1952297421f4dbced1efcce26ec377539ff01))
* give feedback ui and logic ([3195eb6](https://github.com/ajbates93/trellis/commit/3195eb6a41dfe19265b9ce730312c5b2ccfcdab0))
* goals implementation ([1ec31a3](https://github.com/ajbates93/trellis/commit/1ec31a31772350fc2333d9444874fff512647148))
* heading size increases ([3038a5a](https://github.com/ajbates93/trellis/commit/3038a5a0ced8588d182ef64d42aa343ca69aca10))
* homepage dashboard design ([bbacc4e](https://github.com/ajbates93/trellis/commit/bbacc4ee4a1714a56a539a68365301584c8da71d))
* implement better loading ux ([55fcd38](https://github.com/ajbates93/trellis/commit/55fcd3816bcd71b2a44869f3120ce2c2b5d2690d))
* implementation with railway and db init ([c59287d](https://github.com/ajbates93/trellis/commit/c59287dbb236950d107d0e4c4dc029e0452478b0))
* improve review card clarity by displaying reviewee name ([f54241c](https://github.com/ajbates93/trellis/commit/f54241cad584a37c2fab07c6625dccbdc35dca9b))
* improve review card clarity by displaying reviewee name ([34c0361](https://github.com/ajbates93/trellis/commit/34c03619086043c5ba31a23f7d9df68c24cdc8f6))
* initial brag bucket work / db, api etc. ([22009fe](https://github.com/ajbates93/trellis/commit/22009feebf5f7f4e6679fb21a9815c06a7662230))
* initial email password impl with account linking and manual password hashing ([352a1dd](https://github.com/ajbates93/trellis/commit/352a1dd39b9b03c31977594c3263f791c776d814))
* initial navigation rework ([514b584](https://github.com/ajbates93/trellis/commit/514b584e991ca7390c1bc6d64b52f44364f86ccc))
* lots more updates to review ui ([9313c3d](https://github.com/ajbates93/trellis/commit/9313c3d2a692599d2f88e2e07f4378cd6a2535a0))
* lots of minor updates around styling ([655ef51](https://github.com/ajbates93/trellis/commit/655ef513426aa089445fea8e2ae060db7cad2d4f))
* lots of updates around toasts and railway ([3b77708](https://github.com/ajbates93/trellis/commit/3b77708d2361af3ef7757eaed147807938295f44))
* migrate core feedback endpoints ([789346a](https://github.com/ajbates93/trellis/commit/789346abcc4bfba6db458bab6d4de625c668fe86))
* migrate core goals endpoints ([fbe655d](https://github.com/ajbates93/trellis/commit/fbe655d6ebb4f60bf588da8fed78492eb6358272))
* mobile fixes ([e63794a](https://github.com/ajbates93/trellis/commit/e63794ac18a930a0a691ccbabf670510bd492afa))
* mobile nav ([dca777c](https://github.com/ajbates93/trellis/commit/dca777c4a5d7e01393424d3cc6c81dcd473cc575))
* more text sizes ([08fde10](https://github.com/ajbates93/trellis/commit/08fde10bc796b3b83853691a2d03152d82512878))
* much nicer feedback submission UX ([9776c2d](https://github.com/ajbates93/trellis/commit/9776c2de7753b6657dd2c2fc936bc5e0cf25ba41))
* nicer ux for users with not enough feedback ([2976e69](https://github.com/ajbates93/trellis/commit/2976e69ff5b688a8a6a426709e81afc6fac2884f))
* page heads ([9cacc80](https://github.com/ajbates93/trellis/commit/9cacc80c8e646022e23dede595be962904396253))
* remove given column from buddy view of feedback table ([0a78074](https://github.com/ajbates93/trellis/commit/0a78074012e8e71eef6f7f78f61cc6c2d96ffb26))
* remove outdated feedback / review assignment ([481731b](https://github.com/ajbates93/trellis/commit/481731b56cdbb1e58160f51f5cabb198553205c4))
* remove passthroughs and fix buddies / users lists ([3853bdd](https://github.com/ajbates93/trellis/commit/3853bddfafffb4b12db164dc4d49fd306a44ac73))
* rename to trellis ([c152622](https://github.com/ajbates93/trellis/commit/c152622070554aaccd27160a0bc63808b79847f5))
* reviews reflections ([04663b6](https://github.com/ajbates93/trellis/commit/04663b61d190c932f12a5e95a77d7fb20283e700))
* send feedback form readability ([d1eba23](https://github.com/ajbates93/trellis/commit/d1eba23fa0f24643d3a9fff62b284b8f7ec17f67))
* sentry integration ([032705c](https://github.com/ajbates93/trellis/commit/032705c2f7f1c5b57b93661912e5f3e3488c9e17))
* settings pages ([650073d](https://github.com/ajbates93/trellis/commit/650073dd6446a2ecd0aed533a0c1a9dca4077c3a))
* slack integration ([8468536](https://github.com/ajbates93/trellis/commit/846853676b7fd7d091ac9558c4923a066c05afc7))
* small tweaks ([35146a4](https://github.com/ajbates93/trellis/commit/35146a4fd33ae447f183035902c0e2e795643410))
* some validation improvements ([978fe10](https://github.com/ajbates93/trellis/commit/978fe100426225414dc2bc2b1ac0e0b042f5344e))
* spotlight feedback items ([8780841](https://github.com/ajbates93/trellis/commit/87808417b917134f285ef01b4f1488cc17dab3d6))
* staging env setup ([09be93e](https://github.com/ajbates93/trellis/commit/09be93ece2b96fcc46cb6b8aabbbc8b7d0761991))
* start adding feedback page ui ([4c41cbe](https://github.com/ajbates93/trellis/commit/4c41cbee4461b2177495ac62c3caae76f7a430b1))
* start adding feedback system with db seeding ([3dfe445](https://github.com/ajbates93/trellis/commit/3dfe445adb32ff21b6cae6b1054a66571045daad))
* start adding more settings pages ([9917928](https://github.com/ajbates93/trellis/commit/9917928db3a5cf66bd1ce984edc8319c0f5aeabf))
* switch to snaggd async loader ([6a0cccd](https://github.com/ajbates93/trellis/commit/6a0cccde30a1440a0cd2c33463f468d869a294af))
* timeline upgrades and move link location in navigation. ([50a907c](https://github.com/ajbates93/trellis/commit/50a907c3d638508c1151e028da9d856b547eec8e))
* user management and csv upload ([627a5be](https://github.com/ajbates93/trellis/commit/627a5be7d48713710b02d04bfc39555a5f5b6b06))
* useState for retaining selected buddy ([dd02b02](https://github.com/ajbates93/trellis/commit/dd02b023482f85d211ff902791d6c7fa23b1ff8c))
* visual updates to goals ([32e7434](https://github.com/ajbates93/trellis/commit/32e7434ff16f2646781c876f3bc867570dc9f86d))
* wizard tasks ([c1cfe25](https://github.com/ajbates93/trellis/commit/c1cfe252a5da488be358009b3665747587147697))
* workspaces ([3941f73](https://github.com/ajbates93/trellis/commit/3941f7369a272efee0388c291a5aa636033affb2))
* zod schema ([c545f43](https://github.com/ajbates93/trellis/commit/c545f43004b4427f47aa5855230ef4c30b234900))


### Bug Fixes

* a couple of UI fixes ([3e1e77d](https://github.com/ajbates93/trellis/commit/3e1e77d44df6e3a4f70289650d88e3ae2524769c))
* add 'management' as option ([432a91b](https://github.com/ajbates93/trellis/commit/432a91b98e9084742c4cb7b2c0c08b13971da0bc))
* add close button for mobile nav ([3fea5cd](https://github.com/ajbates93/trellis/commit/3fea5cddccfa5b16855a2da327788c2d0626fcc3))
* add growth as roletype in schemas ([dba92fe](https://github.com/ajbates93/trellis/commit/dba92fecf8453765561624f0dcb852cead5aadc6))
* add integration utility helpers ([c1d7c7b](https://github.com/ajbates93/trellis/commit/c1d7c7bdea2aebaaa173d90d5208ad65116e29d1))
* add slack integrations to public routes ([8563227](https://github.com/ajbates93/trellis/commit/8563227e767eb4b238c238998f2eae3895193378))
* add write permissions to workflow ([ee443d5](https://github.com/ajbates93/trellis/commit/ee443d589a2d34e29840d874a42f8d8e42958fd2))
* assign feedback to reviews for buddy ([cbf0352](https://github.com/ajbates93/trellis/commit/cbf03523887509c68d1baa88787662c3e95b24d8))
* auth theme ([81cb7b2](https://github.com/ajbates93/trellis/commit/81cb7b221155e437481a444b7f1e0a89f3d2e2f0))
* better check-ins UI ([ec357a0](https://github.com/ajbates93/trellis/commit/ec357a040375a95902f114bd1dda40e9c01127db))
* better deploy ([5c4e567](https://github.com/ajbates93/trellis/commit/5c4e567756abf57c877fdb0d47d5fea06b7acac0))
* better logging in slack util ([3efea91](https://github.com/ajbates93/trellis/commit/3efea91c0b22b4f8180160c6184631c885ca14a7))
* better start/stop impersonation ([acb9cdc](https://github.com/ajbates93/trellis/commit/acb9cdcc6b749ea924220d2cb9014460de610356))
* better tabs ([82d5a03](https://github.com/ajbates93/trellis/commit/82d5a0350b2f8e78bb88e0509f1a9b88b35cc22f))
* buddy assignment on user creation ([07b7c7e](https://github.com/ajbates93/trellis/commit/07b7c7e782f3f5f0beac61e24b328d5470277d8c))
* bug around worksapces ([ccbc5b7](https://github.com/ajbates93/trellis/commit/ccbc5b725aafdc1ca971fa87e96fcbc55491d42a))
* bug fixes ([7c2b4c5](https://github.com/ajbates93/trellis/commit/7c2b4c5269ff2a08b1dc6fa62fd4ea6f72704e37))
* clear query params ([e639ea5](https://github.com/ajbates93/trellis/commit/e639ea57397c41650c96de8ed658d67e15c7c820))
* dashboard mobile ([39e814c](https://github.com/ajbates93/trellis/commit/39e814cef82a5be3c117154b97144a2a5d1b358e))
* display value in dropdowns ([86657be](https://github.com/ajbates93/trellis/commit/86657be43b641bcb93d0628b650914b0957dd919))
* don't omit optional deps ([871aec2](https://github.com/ajbates93/trellis/commit/871aec2eb96fe418f29a9b9adda0920cc8f02a66))
* don't validate unused body mark as read ([a22c249](https://github.com/ajbates93/trellis/commit/a22c249689c7826a6c4627e1ca766203edc9c4e6))
* dropdown options in admin ([c4c19ed](https://github.com/ajbates93/trellis/commit/c4c19eda941978375099d6c9f196df332598b068))
* empty states and response shape ([e778cb0](https://github.com/ajbates93/trellis/commit/e778cb009562becef6796dc86ef34ed1a1dbb58d))
* enable debug on snaggd ([2704e88](https://github.com/ajbates93/trellis/commit/2704e88c310bfc3df81113bb9d64f0b0858af348))
* eslint errors ([8503933](https://github.com/ajbates93/trellis/commit/8503933c76a10d59d85953d572e70f0d4a4d6b8e))
* feedback max length 5000 -&gt; 3000 ([80c5545](https://github.com/ajbates93/trellis/commit/80c55458765f73b5a68d9d0088f7e8b1b80abd10))
* force dark mode ([088a7bd](https://github.com/ajbates93/trellis/commit/088a7bdc9fbb8a6386eb8f9dcad67c9d5530f716))
* forgot to commit scheduled task for review reminders ([462a939](https://github.com/ajbates93/trellis/commit/462a9399a76d96f9e31d0d88543fce1638c89c4e))
* forgot to remove test isImpersonating ([2532b07](https://github.com/ajbates93/trellis/commit/2532b07e2910decdf6c409b04268d0ddac39e539))
* further name matching ([a4e8034](https://github.com/ajbates93/trellis/commit/a4e803492592c704590966486c7fb107daf1acce))
* handle existing tags in Github release workflow ([352f784](https://github.com/ajbates93/trellis/commit/352f7847d100cb8402adb12232a422b1efddb2f1))
* hide buddy pages in mobile ([925f202](https://github.com/ajbates93/trellis/commit/925f202c3ec78039ebc34d0630995a39e3406d58))
* homepage stats and review achievements icon ([54711f1](https://github.com/ajbates93/trellis/commit/54711f1ab8778f3f5c89d561f4b34d32b27f30dc))
* input formatting ([a152503](https://github.com/ajbates93/trellis/commit/a1525038eeb1fb53deeb62a9829cff1d1872d61a))
* lint ([dbe03f0](https://github.com/ajbates93/trellis/commit/dbe03f07f26dda2cdef1273111e89a6de7cb2e9d))
* lint ([94e6973](https://github.com/ajbates93/trellis/commit/94e6973e28ebf6f625713c75fc37b8af5c06f07c))
* lint ([28809a8](https://github.com/ajbates93/trellis/commit/28809a887c4c268f31461944433e48d69618930c))
* lint ([3ca2ea9](https://github.com/ajbates93/trellis/commit/3ca2ea968508bc0c3d02306db12db193f1a0d9c7))
* lint ([9078094](https://github.com/ajbates93/trellis/commit/907809432927cfc3ffa224a74395845d39d55128))
* lots of fixes for reviews ([ce196c2](https://github.com/ajbates93/trellis/commit/ce196c2130029d25fb2fc1f785020223c9b53578))
* lots of little snags ([61f30fe](https://github.com/ajbates93/trellis/commit/61f30fe364130af3e86a00a0b7dc5330a7024fb1))
* lots of npx typecheck fixes ([00e6f24](https://github.com/ajbates93/trellis/commit/00e6f24d60173d27028fd3e3ce68b9140e99b99f))
* lots of npx typecheck fixes ([954e848](https://github.com/ajbates93/trellis/commit/954e84874e8da5ec3b4d4fb29e36172bb2ecf693))
* mark as read action ([0ca7838](https://github.com/ajbates93/trellis/commit/0ca78381519ac0da917b1352f7935bdd5bb36a55))
* mobile avatar ([2beecc2](https://github.com/ajbates93/trellis/commit/2beecc219726e91cb6190f2b25123e18d52dd051))
* mobile content padding ([984d510](https://github.com/ajbates93/trellis/commit/984d510ff3f9e81e8980c4b531147c5968edf47d))
* modal fix ([49f5fcf](https://github.com/ajbates93/trellis/commit/49f5fcfafd964dfaaaf507b79aa7317e1dcc8867))
* more auth fix ([45b5066](https://github.com/ajbates93/trellis/commit/45b5066e0cd071b78029a24eaaabee4980364d2b))
* more eslint ([486c76c](https://github.com/ajbates93/trellis/commit/486c76cfed4f389033bbc994bb6c359dd929b0e8))
* move create review logic to buddy section ([d07a1f0](https://github.com/ajbates93/trellis/commit/d07a1f03e312c0687f9f2182818acf835717578b))
* nixpack fixes ([aff340d](https://github.com/ajbates93/trellis/commit/aff340db26ca18b12b7a45adc073381e05c835c9))
* normalise name ([14ea788](https://github.com/ajbates93/trellis/commit/14ea788b9a7d4204a453ee51d92a79d4af40d220))
* notes ([ef8ec1c](https://github.com/ajbates93/trellis/commit/ef8ec1c79bed103511ef891168902297353d419d))
* nvim stuff ([1365dbc](https://github.com/ajbates93/trellis/commit/1365dbce2c10ca58d11e0455a68cda444825faf5))
* padding on mobile and tablet ([50119c9](https://github.com/ajbates93/trellis/commit/50119c9034bd50b9e0a77d4584d361f580627fc6))
* profile button fixes ([333cefd](https://github.com/ajbates93/trellis/commit/333cefd939a282bcb6d4eabfe2d4d2445e1d3293))
* regenerate migrations and improve CI/CD error handling ([d8a257c](https://github.com/ajbates93/trellis/commit/d8a257cc55db0a77073f487e2328e9a27794ae3a))
* regex fix ([8ee46e8](https://github.com/ajbates93/trellis/commit/8ee46e82c569c86022a4ab94bf80e2633b6ca92f))
* remove animations from feedback give page ([4445cf9](https://github.com/ajbates93/trellis/commit/4445cf901f05ea888aa4999bb2725732fcdfd5a6))
* remove duplicate migration files that were never applied ([fcffcc0](https://github.com/ajbates93/trellis/commit/fcffcc0c7b3c197b7fc93d263664ca99c828027f))
* remove emdash ([a2f7293](https://github.com/ajbates93/trellis/commit/a2f7293d72cc039dc0c0d0d0e382c4e6a45a07f5))
* remove requirement for pocketworks email ([8c1ccce](https://github.com/ajbates93/trellis/commit/8c1ccce61a17267aab7b94152fb3cc2d783456d3))
* remove slack team info ([b9c694f](https://github.com/ajbates93/trellis/commit/b9c694ff4b2ed7baba22d857a2545dc54548e265))
* response handling, edit and delete reviews, formatting ([d4a2ac9](https://github.com/ajbates93/trellis/commit/d4a2ac9b46376d1bc79b2413c73d7780cd5a2a1e))
* response shape ([89cf285](https://github.com/ajbates93/trellis/commit/89cf285c5d8b4316a93e82a0d7ab308fe75ec9c6))
* return empty response ([d41f5a0](https://github.com/ajbates93/trellis/commit/d41f5a0531a5c551cac244c502e30caabfe3675a))
* review achievments fix ([fadec8a](https://github.com/ajbates93/trellis/commit/fadec8ae7e7ef7c8443dec2db140a016bfd9502c))
* review goals achievments filtering ([3cb1162](https://github.com/ajbates93/trellis/commit/3cb1162e205d49e221513f5fea8ec2aff5f5c154))
* review reminders ([575f704](https://github.com/ajbates93/trellis/commit/575f704950fdaf24ec164902ac177b4dd9f96824))
* review reminders ([b700a2b](https://github.com/ajbates93/trellis/commit/b700a2bc5833760008b316395d478c7ef1ea0126))
* reviews pages initial work ([0c23707](https://github.com/ajbates93/trellis/commit/0c23707e568bb427bd76c1ded8b65be2fc1d8385))
* reviews UI ([7f6d688](https://github.com/ajbates93/trellis/commit/7f6d688eceaaed99e3d45405218b28526c6e6a2a))
* rework nav to be submit feedback / feedback ([dbe93bc](https://github.com/ajbates93/trellis/commit/dbe93bc3e0cf4e8615cd364bceaf969a9b4eeaa7))
* scrolling and chip -&gt; badge ([8ddcdaf](https://github.com/ajbates93/trellis/commit/8ddcdaf2df7e88dc21d9b6ff48820a722ad1ff4d))
* select menu width ([4416ba2](https://github.com/ajbates93/trellis/commit/4416ba20649342a2c899579dfbb68185fe668482))
* sentiment total rounding ([5cc4c30](https://github.com/ajbates93/trellis/commit/5cc4c30d78d094920bf1036cfdbcd09734c47baf))
* sentry release ([c7336dc](https://github.com/ajbates93/trellis/commit/c7336dc184634b7326cf83365929b5d804a3301e))
* simplify ([8b05512](https://github.com/ajbates93/trellis/commit/8b05512779be55323a364e4b0329e4fd29feab38))
* some dashboard improvements ([ee448cd](https://github.com/ajbates93/trellis/commit/ee448cdebd764fce9332090e46a48eeddcf85aeb))
* some implementation bugs. add refresh after user feedback analysed. ([5a4ad68](https://github.com/ajbates93/trellis/commit/5a4ad6815180faa36a41cda65a8a3bd22fa9c619))
* timezone bug ([b848d6c](https://github.com/ajbates93/trellis/commit/b848d6c42e2bd202b5a3b74f1298b97091b378c0))
* try better name matching ([717f04d](https://github.com/ajbates93/trellis/commit/717f04d7400b10b1399bc1f274a283fa72833791))
* try this ([dd962ae](https://github.com/ajbates93/trellis/commit/dd962aeee3c00facb541d90a84301e902841e77c))
* ts fix ([25d68a7](https://github.com/ajbates93/trellis/commit/25d68a7bd94615fbd0ec2160feaf46f09d5a090f))
* type error ([057ed29](https://github.com/ajbates93/trellis/commit/057ed2906cb7f7d773bf8619d6fd4648f53e124e))
* ui ([d224ebb](https://github.com/ajbates93/trellis/commit/d224ebbd23a109879401f4884ca5382b0c0af373))
* ui updates to other tabs ([f6289d9](https://github.com/ajbates93/trellis/commit/f6289d928f9c5c1667457eee57bd862642e20ef1))
* upcoming reviews change email subject ([#37](https://github.com/ajbates93/trellis/issues/37)) ([27437e5](https://github.com/ajbates93/trellis/commit/27437e5d16f30afbb41622262475a984e3dc509b))
* update buddies goals page to use new tab format. ([58187c7](https://github.com/ajbates93/trellis/commit/58187c70edd84c34c0a28af8568c1b610437e02b))
* update charting libraries ([478318d](https://github.com/ajbates93/trellis/commit/478318dab8ac35267441e6a520e7ba7acc0b6d3d))
* update readme ([2f3d91e](https://github.com/ajbates93/trellis/commit/2f3d91ea0faad98f4900423ca3fb8fe9a503d33e))
* update session expiry to 30 days and refresh if older than 7 for active users ([0605e85](https://github.com/ajbates93/trellis/commit/0605e8560be85d7266859b34fbbb3af789216aa7))
* update to submit feedback in text ([caef4ac](https://github.com/ajbates93/trellis/commit/caef4ac25a204ecac15e511ee6aa3486139d7ac2))
* ux improvements for reviews ([635c02c](https://github.com/ajbates93/trellis/commit/635c02c1fde3457a2e7a050e0cdaaf20a795e3e2))


### Refactoring

* add composable for reviews ([fadc0ba](https://github.com/ajbates93/trellis/commit/fadc0ba38dc4c53a9a167e25b222fad345fddd51))
* create review cards components ([6fc7888](https://github.com/ajbates93/trellis/commit/6fc7888af2d0650800ce97b21494ff945e0297dc))
* move question generator into help column ([c19fbab](https://github.com/ajbates93/trellis/commit/c19fbabf86215585ba22783415d2dae6dad47096))


### Documentation

* add workspace model multi-tenancy architecture documentation ([79f3422](https://github.com/ajbates93/trellis/commit/79f34228a205aeda14e6a579162c4e2b2e1e7634))


### Miscellaneous

* clean up logging ([7e82992](https://github.com/ajbates93/trellis/commit/7e829921e27961b6336ef83269473842ff4c814f))
* docs ([47247c4](https://github.com/ajbates93/trellis/commit/47247c43467741dffd86a2b08a3e00a5d4d3049b))
* forgot to commit package.json ([8423e17](https://github.com/ajbates93/trellis/commit/8423e1759190a019dea68cba9814dfc33d5edfdf))
* password cleanup ([b75cf62](https://github.com/ajbates93/trellis/commit/b75cf6297d97db5b13e334b09d7e1b3562579a35))
* remove logging ([e2433da](https://github.com/ajbates93/trellis/commit/e2433da4b22ec6d46846ff83bf0b11b6cfab0753))
* update development plan ([8bd9d78](https://github.com/ajbates93/trellis/commit/8bd9d78094e3d58a73a5b51eaf3d49dd2d6a7db9))
