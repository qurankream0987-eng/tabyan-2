Source: https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet
Title: Tarteel Migrates to CoreWeave with Support from Zeet
Fetched: 2026-10-10T08:31:34.872Z

Announcement

Webinar

Podcast

GTC 2026

CoreWeave Forge is here: connect your AI loop and compound every improvement. [Read more](https://www.coreweave.com/blog/coreweave-forge-turn-ai-iteration-into-compounding-improvement)

[home](https://www.coreweave.com/)

[Contact us](https://www.coreweave.com/contact-us)

![Search](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/68920fad5b61c147e4940a95_search_icon.svg)

Clear![Close](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/6892202b6ce795bfd2b1cd15_search_close.svg)

![Close](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/67e5ab6a9e0abe9807b2e9fe_close_button_white.svg)

![Tarteel Migrates Cloud Infrastructure to CoreWeave with Help from Zeet](https://cdn.prod.website-files.com/62bc66d283fd9c34ffec780a/681e4cec46648af8f000a615_645b9a832febe654853c5439_Copy%2520of%2520Blog%2520thumbnailhero%2520image%2520(1520%2520%25C3%2597%25201098%2520px)%2520(760%2520%25C3%2597%2520549%2520px)%2520(1).avif)

### _Tarteel AI leveraged Zeet to smoothly move its deployment from AWS to CoreWeave, translating to a 22% improvement in latency and ~56% cost reduction._

For Tarteel, an AI-powered Quran app, switching from AWS to CoreWeave was a no-brainer.

Lured by the flexibility to choose from a broad portfolio of the latest NVIDIA GPUs, affordable pricing, and integration with deployment partner Zeet, Tarteel migrated its entire cloud infrastructure over to CoreWeave.

## Groundbreaking AI

Tarteel is an AI-powered Quran study app that helps 2B+ Muslims around the world practice and improve their relationship with their faith. The app is interactive and voice-guided, meaning users converse with it, much like they would with a teacher.

Tarteel follows along as users recite verses, highlighting the words as they’re said and flagging mistakes in real time. Users can also search the Quran and related texts in Arabic using their voice.

Tarteel corrects recitation (the eponymous use case of the app), sentence structure, detects incorrect word choices, and points out the distinctions between similar verses to help users understand context and aid in memorizing the Quran.

With 3M+ downloads, a growing user base, and 250k+ audio hours transcribed per month, Zeet and CoreWeave are helping Tarteel hit its stride.

## Big Opportunity

Unsatisfied with legacy cloud offerings, including a lack of observability for workloads, an underwhelming GPU selection and an unoptimized solution for inference and production workloads, Tarteel saw multiple growth opportunities with CoreWeave.

CoreWeave offers clients tangible advantages over large legacy cloud providers, including out-of-the-box [observability](https://docs.coreweave.com/coreweave-kubernetes/prometheus/grafana), the industry's [broadest range of NVIDIA GPUs](https://www.coreweave.com/blog/best-nvidia-gpus-for-serving-inference-on-coreweave), responsive autoscaling, best-in-class support, [excellent documentation](https://docs.coreweave.com/), and seamless [integration with Zeet](https://www.coreweave.com/blog/zeet-and-coreweave-make-it-simpler-for-ai-companies-to-manage-kubernetes-infrastructure).

CoreWeave gives Tarteel out-of-the-box observability with access to Grafana and Prometheus and offers a native S3 solution, which minimizes Tarteel’s cloud and data transfer costs.

## NVIDIA Riva & NeMo

Tarteel had experimented with various toolkits, but most were tailored for research or specific use cases, with poor inference latency and difficult-to-reproduce SOTA results.

> “Many STT toolkits and libraries we explored failed to deliver on both the performance and accuracy requirements necessary to deliver our unique product experience. They also were not optimized for deploying models in a production environment.”

> – Anas Abou Allaban, Co-Founder and CEO, Tarteel

On CoreWeave, Tarteel can access [NVIDIA’s Riva](https://www.nvidia.com/en-us/ai-data-science/products/riva/) and NVIDIA [NeMo](https://developer.nvidia.com/generative-ai) toolkits. NeMo gave the team the ability to quickly train and fine-tune SOTA ASR and TTS models on Tarteel’s own data and custom hyperparameters. This allowed the team to maximize WER performance and achieve amazing results recognizing Quran recitation.

The team then leveraged Riva to deploy NeMo models with Triton, delivering blazing-fast inference speeds compared to other frameworks. Riva also gave Tarteel the ability to modify the behavior of the models in production by adjusting parameters related to audio chunk size, padding, and Voice Activity Detection (VAD) to deliver the best end-user experience possible.

## Post-Migration

With Riva and NeMo, Tarteel achieved real-time production performance and reproducible SOTA results by optimizing latency and streaming audio, and support for scaling AI model inferencing to multiple GPUs with [NVIDIA Triton](https://developer.nvidia.com/triton-inference-server).

After migration, Tarteel recorded:

- ~1,600 requests/min. On average over 40 NVIDIA GPUs (A4000/5000s)
- 22% improvement in latency
- Median request latency: 423.5ms
- ~56% cost reduction

Tarteel plans to use NVIDIA’s SDKs and toolkits for new use cases like NLP and TTS.

## Can’t Beat Zeet

Tarteel uses Zeet to deploy services to multiple cloud providers in multiple regions (US, EU, AP).

Zeet made the migration to CoreWeave swift and simple, quickly resolving issues, like setting up load balancing and DNS, to ensure that migration time was minimal, at 1-2 days total.

> “Zeet made the switch to CoreWeave a breeze. We had minimal downtime and did not need any K8s or CW expertise, we just clicked a few buttons and we were live.”

> – Anas Abou Allaban, Co-Founder and CEO, Tarteel

Zeet made autoscaling and deploying incredibly straightforward. Without having to worry about deployments, Tarteel has been able to focus on improving its product and services.

> “Just write a Docker container and your app is ready to be shipped on Zeet and CoreWeave. When you’re ready to scale, all you need is a few clicks to configure autoscaling or manually increase your replica count.”

> – Anas Abou Allaban, Co-Founder and CEO, Tarteel

## What’s Next for Tarteel?

As Tarteel continues to harness AI to help enrich Muslims' experience with the Quran, they seek to save ancient texts that are at risk of being lost to history and provide important context on verses of the Quran.

> “Our goal is to continue leveraging AI to deliver unique and personalized experiences for Muslims to better practice & engage with their faith. This includes experiences related to semantic search, Q&A (NLP), forecasting/spaced repetition to find the best chapter to recite/revise, and digitizing Islamic/Arabic literature.”

> – Anas Abou Allaban, Co-Founder and CEO, Tarteel

Zeet and CoreWeave will be with them every step of the way to help deliver maximum value to their users.

Share this article:

[LinkedIn](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet#)[X](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet#)[Facebook](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet#)[Email](mailto:?subject=Tarteel%20Migrates%20to%20CoreWeave%20with%20Support%20from%20Zeet&body=https%3A%2F%2Fwww.coreweave.com%2Fblog%2Ftarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet)[Copied](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet#)

## Related Blogs

![Left](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/675a2a8f79e7e7d1d58d0dde_arrow_left_circle_gray.svg)

![](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/62dac1bb8d0568e4fe9717a2_placeholder_gpu-pricing.avif)![CoreWeave Direct-to-Expert:  Work With the Engineers Who Built CoreWeave Cloud](https://cdn.prod.website-files.com/62bc66d283fd9c34ffec780a/6ac57cf3151163db5007e865_Direct-to-Expert%20Blog%201520x1098.avif)

### CoreWeave Direct-to-Expert: Work With the Engineers Who Built CoreWeave Cloud

5

min read

[CoreWeave Direct-to-Expert:  Work With the Engineers Who Built CoreWeave Cloud](https://www.coreweave.com/blog/coreweave-direct-to-expert-work-with-the-engineers-who-built-coreweave-cloud "CoreWeave Direct-to-Expert:  Work With the Engineers Who Built CoreWeave Cloud") [CoreWeave Direct-to-Expert:  Work With the Engineers Who Built CoreWeave Cloud](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet# "CoreWeave Direct-to-Expert:  Work With the Engineers Who Built CoreWeave Cloud")

![](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/62dac1bb8d0568e4fe9717a2_placeholder_gpu-pricing.avif)![Closing the Loop Between Inference and Post-Training](https://cdn.prod.website-files.com/62bc66d283fd9c34ffec780a/6ac3c22814f0e1cc88558e4c_infinity-mark_featured-image_1520x1098.avif)

### Closing the Loop Between Inference and Post-Training

7

min read

[Closing the Loop Between Inference and Post-Training](https://www.coreweave.com/blog/closing-the-loop-between-inference-and-post-training "Closing the Loop Between Inference and Post-Training") [Closing the Loop Between Inference and Post-Training](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet# "Closing the Loop Between Inference and Post-Training")

![](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/62dac1bb8d0568e4fe9717a2_placeholder_gpu-pricing.avif)![Fully Connected 2026: Superintelligence Happens When Pioneers Connect](https://cdn.prod.website-files.com/62bc66d283fd9c34ffec780a/6abfe2c5c36c99e2042a93cb_fc26-blog-tile-1520x1098.webp)

### Fully Connected 2026: Superintelligence Happens When Pioneers Connect

3

min read

[Fully Connected 2026: Superintelligence Happens When Pioneers Connect](https://www.coreweave.com/blog/fully-connected-2026-superintelligence-happens-when-pioneers-connect "Fully Connected 2026: Superintelligence Happens When Pioneers Connect") [Fully Connected 2026: Superintelligence Happens When Pioneers Connect](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet# "Fully Connected 2026: Superintelligence Happens When Pioneers Connect")

![](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/62dac1bb8d0568e4fe9717a2_placeholder_gpu-pricing.avif)![CoreWeave Registry: The System of Record for Enterprise AI Assets](https://cdn.prod.website-files.com/62bc66d283fd9c34ffec780a/6abfb6690ae1c846fabb01e2_Pattern-09-1520x1098.avif)

### CoreWeave Registry: The System of Record for Enterprise AI Assets

6

min read

[CoreWeave Registry: The System of Record for Enterprise AI Assets](https://www.coreweave.com/blog/coreweave-registry-the-system-of-record-for-enterprise-ai-assets "CoreWeave Registry: The System of Record for Enterprise AI Assets") [CoreWeave Registry: The System of Record for Enterprise AI Assets](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet# "CoreWeave Registry: The System of Record for Enterprise AI Assets")

![](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/62dac1bb8d0568e4fe9717a2_placeholder_gpu-pricing.avif)![Introducing CoreWeave Notebooks for Interactive AI Development](https://cdn.prod.website-files.com/62bc66d283fd9c34ffec780a/6abd5c62c75918827130a6b3_Pattern-12-1520x1098.webp)

### Introducing CoreWeave Notebooks for Interactive AI Development

4

min read

[Introducing CoreWeave Notebooks for Interactive AI Development](https://www.coreweave.com/blog/introducing-coreweave-notebooks-for-interactive-ai-development "Introducing CoreWeave Notebooks for Interactive AI Development") [Introducing CoreWeave Notebooks for Interactive AI Development](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet# "Introducing CoreWeave Notebooks for Interactive AI Development")

![](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/62dac1bb8d0568e4fe9717a2_placeholder_gpu-pricing.avif)![CoreWeave ARIA: The Coding Agent That Drives Continuous Improvement Across the AI Loop](https://cdn.prod.website-files.com/62bc66d283fd9c34ffec780a/6abd54f32ab366f0af4c64bc_Pattern-11-1520x1098.avif)

### CoreWeave ARIA: The Coding Agent That Drives Continuous Improvement Across the AI Loop

4

min read

[CoreWeave ARIA: The Coding Agent That Drives Continuous Improvement Across the AI Loop](https://www.coreweave.com/blog/coreweave-aria-the-coding-agent-that-drives-continuous-improvement-across-the-ai-loop "CoreWeave ARIA: The Coding Agent That Drives Continuous Improvement Across the AI Loop") [CoreWeave ARIA: The Coding Agent That Drives Continuous Improvement Across the AI Loop](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet# "CoreWeave ARIA: The Coding Agent That Drives Continuous Improvement Across the AI Loop")

![](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/62dac1bb8d0568e4fe9717a2_placeholder_gpu-pricing.avif)![What We Already Know, Waiting to Be Connected](https://cdn.prod.website-files.com/62bc66d283fd9c34ffec780a/6abd4ed0e4475506ef055da4_Material-02-resource-center-tile-1520x1098.jpg)

### What We Already Know, Waiting to Be Connected

4

min read

[What We Already Know, Waiting to Be Connected](https://www.coreweave.com/blog/what-we-already-know-waiting-to-be-connected "What We Already Know, Waiting to Be Connected") [What We Already Know, Waiting to Be Connected](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet# "What We Already Know, Waiting to Be Connected")

![](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/62dac1bb8d0568e4fe9717a2_placeholder_gpu-pricing.avif)![CoreWeave Partner Network Jumpstarts Your AI Stack](https://cdn.prod.website-files.com/62bc66d283fd9c34ffec780a/6abc45744a222d1d8d1ff0af_Partner%20Network%201520x1098.avif)

### CoreWeave Partner Network Jumpstarts Your AI Stack

5

min read

[CoreWeave Partner Network Jumpstarts Your AI Stack](https://www.coreweave.com/blog/coreweave-partner-network-jumpstarts-your-ai-stack "CoreWeave Partner Network Jumpstarts Your AI Stack") [CoreWeave Partner Network Jumpstarts Your AI Stack](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet# "CoreWeave Partner Network Jumpstarts Your AI Stack")

![](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/62dac1bb8d0568e4fe9717a2_placeholder_gpu-pricing.avif)![NVIDIA Vera CPU Is Coming to CoreWeave: Pack In More Agents](https://cdn.prod.website-files.com/62bc66d283fd9c34ffec780a/6abebc6a389392e7c865de18_CPTX_2026_MKT_MktReq_Vera_CPU_Chip_Persp_Black_1520x1098.avif)

### NVIDIA Vera CPU Is Coming to CoreWeave: Pack In More Agents

4

min read

[NVIDIA Vera CPU Is Coming to CoreWeave: Pack In More Agents](https://www.coreweave.com/blog/nvidia-vera-cpu-is-coming-to-coreweave-pack-in-more-agents "NVIDIA Vera CPU Is Coming to CoreWeave: Pack In More Agents") [NVIDIA Vera CPU Is Coming to CoreWeave: Pack In More Agents](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet# "NVIDIA Vera CPU Is Coming to CoreWeave: Pack In More Agents")

![](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/62dac1bb8d0568e4fe9717a2_placeholder_gpu-pricing.avif)![CoreWeave ARENA Delivers Results, Welcomes New Teams](https://cdn.prod.website-files.com/62bc66d283fd9c34ffec780a/6abaa95181da6c6ee9314c64_Arena%20Phase%202%201520x1098.avif)

### CoreWeave ARENA Delivers Results, Welcomes New Teams

5

min read

[CoreWeave ARENA Delivers Results, Welcomes New Teams](https://www.coreweave.com/blog/coreweave-arena-delivers-results-welcomes-new-teams "CoreWeave ARENA Delivers Results, Welcomes New Teams") [CoreWeave ARENA Delivers Results, Welcomes New Teams](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet# "CoreWeave ARENA Delivers Results, Welcomes New Teams")

![Right](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/67589a9ba1831133f17a01a0_arrow_right_circle_gray.svg)

- [Contact us](https://www.coreweave.com/contact-us)
- [Login](https://console.coreweave.com/login)

### Products

- [GPU Compute](https://www.coreweave.com/products/gpu-compute)
- [CPU Compute](https://www.coreweave.com/products/cpu-compute)
- [Storage Services](https://www.coreweave.com/products/storage)
- [Networking Services](https://www.coreweave.com/products/networking)
- [Managed Services](https://www.coreweave.com/products/coreweave-kubernetes-service)
- [Bare Metal Servers](https://www.coreweave.com/products/bare-metal)
- Platform

  - [Fleet LifeCycle Controller](https://www.coreweave.com/mission-control#flc)
  - [Node LifeCycle Controller](https://www.coreweave.com/mission-control#nlc)
  - [Tensorizer](https://www.coreweave.com/solutions/ai-inference#tensorizer)
  - [Observability](https://www.coreweave.com/observability)

### Solutions

- [AI Model Training](https://www.coreweave.com/solutions/ai-model-training)
- [AI Inference](https://www.coreweave.com/solutions/ai-inference)
- [VFX & Rendering](https://www.conductortech.com/)
- [Mission Control](https://www.coreweave.com/mission-control)

### [AI Infrastructure](https://www.coreweave.com/ai-data-centers)

### [Why CoreWeave](https://www.coreweave.com/why-coreweave)

### Resources

- [Customer Stories](https://www.coreweave.com/case-studies)
- [Documentation](https://docs.coreweave.com/)
- [Status](https://status.coreweave.com/)
- [Pricing](https://www.coreweave.com/pricing)
- [Resource Center](https://www.coreweave.com/resource-center)
- [Events & Webinars](https://www.coreweave.com/events)

### [About](https://www.coreweave.com/about-us)

- [About Us](https://www.coreweave.com/about-us)
- [Careers](https://www.coreweave.com/careers)
- [Life at CoreWeave](https://www.coreweave.com/coreweave-company-culture)
- [Newsroom](https://www.coreweave.com/newsroom)
- [Investor Relations](https://investors.coreweave.com/)
- [Supplier Code of Conduct](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/69371755a36799d85e299655_CoreWeave_Supplier_Code_of_Conduct.pdf)
- [Privacy Policy](https://docs.coreweave.com/policies/terms-of-service/privacy-policy)
- [Terms of Service](https://docs.coreweave.com/policies/terms-of-service)
- [Do Not Sell or Share My Personal Information](https://www.coreweave.com/blog/tarteel-migrates-cloud-infrastructure-to-coreweave-with-help-from-zeet#)


© CoreWeave.

290 W Mt Pleasant Ave

Suite 4100

Livingston, NJ 07039

[![CoreWeave](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/6778537637e2049e3a9bfe7d_logo_icon_small_dark.svg)](https://www.coreweave.com/)

CoreWeave Kubernetes Service (CKS),

![](https://cdn.prod.website-files.com/62ba1fb86485b6d5029975c4/68e3f252630cc707433fdf32_icon_copy.svg)

Copy code

Copied!

CoreWeave Kubernetes Service (CKS),