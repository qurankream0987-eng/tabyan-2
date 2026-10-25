# Source capture: market-qul-faq

URL: https://qul.tarteel.ai/faq
Fetched: 2026-10-15

# Frequently Asked Questions

QUL is a comprehensive platform for Quranic resources.
It provides access to structured and reliable data, along with tools to explore, manage, and contribute to Quranic resources.
Researchers, students, and developers can leverage resources from QUL to build Islamic applications, perform data analysis, and conduct advanced research or studies related to the Quran.
Below are answers to some of the most common questions about QUL.
If you don’t find what you’re looking for, please open a new issue on our
[GitHub repository](https://github.com/TarteelAI/quranic-universal-library/issues/new/choose).


[🔗](https://qul.tarteel.ai/faq#faq-1)[What is QUL?](https://qul.tarteel.ai/faq#faq-1)

Quranic Universal Library (QUL) is a platform designed to manage Quranic resources. It consists of three core components:

- **Quranic Resources:** One of the largest collections of Quranic resources available for download in various formats.
- **Tools for Resource Creation and Fixing:** Tools that enable users to create new content or fix issues in existing resources.
- **Admin Panel:** An admin panel that allows content moderation, provides various utilities for exporting content in custom formats, facilitates browsing through resources, manages users and permissions, and much more.

[🔗](https://qul.tarteel.ai/faq#faq-7)[Who is behind QUL?](https://qul.tarteel.ai/faq#faq-7)

QUL is proudly developed by Tarteel.. For a full list of contributors and credits, please visit the [Credits page](https://qul.tarteel.ai/credits).

[🔗](https://qul.tarteel.ai/faq#faq-12)[What are some projects using data from QUL?](https://qul.tarteel.ai/faq#faq-12)

Many Quranic applications use data from QUL, including the following popular ones:

- [Quran for Android](https://play.google.com/store/apps/details?id=com.quran.labs.androidquran)
- [Quran for iOS](https://apps.apple.com/us/app/quran-by-quran-com-%D9%82%D8%B1%D8%A2%D9%86/id1118663303)
- [Tarteel for Android](https://play.google.com/store/apps/details?id=com.mmmoussa.iqra) \| [Tarteel for iOS](https://apps.apple.com/us/app/tarteel-%D8%AA%D8%B1%D8%AA%D9%8A%D9%84-memorize-quran/id1391009396)
- [Al Quran (Tafsir & By Word) for Android](https://play.google.com/store/apps/details?id=com.greentech.quran)

[🔗](https://qul.tarteel.ai/faq#faq-13)[What kind of resources are available on QUL?](https://qul.tarteel.ai/faq#faq-13)

QUL provides a wide range of Quranic resources for researchers, students, and developers. These resources support building Quranic applications, training or enhancing AI models, conducting scholarly research, and more. The available resources include:

- **Quran Scripts & Fonts:** Quranic scripts and images for each Ayah and word. Some scripts also include Tajweed support.
- **Translations:** A comprehensive collection of Ayah-by-Ayah and word-by-word translations in multiple languages.
- **Recitations:** Audio recitations from various renowned Qaris.
- **Tafsirs:** Classical and contemporary Quranic commentaries.
- **Mushaf Layouts:** Different Quranic page layouts used across regions and print editions.
- **Mutashabihat & Similar Ayahs:** Data highlighting recurring and thematically related verses.
- **Surah Information:** Metadata and contextual information for each Surah.
- **Topics and Themes:** Categorized subjects and thematic groupings of verses.
- **Grammar and Quranic Corpus Data:** Detailed grammatical and linguistic analysis of Quranic text.

[🔗](https://qul.tarteel.ai/faq#faq-5)[What is the process for submitting corrections or updates to the data?](https://qul.tarteel.ai/faq#faq-5)

You can submit corrections or updates using one of the following methods:

1. **Open a New Issue on GitHub:** Visit our GitHub page ( [link](https://github.com/TarteelAI/quranic-universal-library)) and create a new issue to report the correction.
2. **Request Permission within QUL:** If you need direct access to edit a resource, request permission within QUL. To do so, visit the Tools ( [link](https://qul.tarteel.ai/tools)) page, select the relevant resource type, and click the **“Send Access Request”** button. Once your request is approved, you will be able to update the content directly within QUL.

[🔗](https://qul.tarteel.ai/faq#faq-6)[What is the process for submitting a new translation, tafsir, or reciter?](https://qul.tarteel.ai/faq#faq-6)

To submit a new translation, tafsir, or reciter, please create a new issue on [GitHub](https://github.com/TarteelAI/quranic-universal-library/issues/new/choose). Include all necessary details such as the source, author information, and licensing details. We will review your submission and consider it for inclusion in our collection.

[🔗](https://qul.tarteel.ai/faq#faq-10)[How can I ensure that the information is accurate?](https://qul.tarteel.ai/faq#faq-10)

QUL strives for accuracy by sourcing data from reliable and reputable sources. However, we also rely on users to identify any issues. You can verify the information by cross-checking it with other trusted sources and reporting any discrepancies. We regularly review and update the data, and user contributions play an important role in maintaining its accuracy.

[🔗](https://qul.tarteel.ai/faq#faq-4)[Why is this translation, tafsir, reciter, or layout that I know of not included in QUL?](https://qul.tarteel.ai/faq#faq-4)

QUL is continuously expanding its collection of resources. If you notice a missing resource, you can suggest it, and we will consider it for inclusion in future updates.

[🔗](https://qul.tarteel.ai/faq#faq-9)[Can I use the data in a commercial project?](https://qul.tarteel.ai/faq#faq-9)

Yes, you can use QUL data in commercial projects. However, please review the licensing terms for each resource. Some data may have restrictions or require attribution, while others are freely available for commercial use.

[🔗](https://qul.tarteel.ai/faq#faq-2)[What export formats are available for translations?](https://qul.tarteel.ai/faq#faq-2)

All translations are available in **JSON** and **SQLite** database formats. Additionally, each translation can be exported using two structures:

- **Nested Array Structure:** Translations are organized by Surah, with each Surah represented as an array containing translations for each Ayah. Example:


```jsx
[ ["translation of 1:1", "translation of 1:2"], ["translation of 2:1"] ]
```

- **Key-Value Structure:** In this structure, translations are stored as key-value pairs, where the key is the Ayah reference (e.g., 1:1) and the value is the corresponding translation. Example:


```jsx
{ "1:1": "translation of 1:1", "1:2": "translation of 1:2", ... "114:6": "translation of 114:6" }
```


Translations that include footnotes are available in the following formats:

- **Footnotes as Tags Format:** In this format, footnotes are embedded directly within the translation text using a `<sup>` tag with a `foot_note` attribute. The actual footnote content is stored separately in the `f` hash, keyed by the footnote ID. Example:


```jsx
{ "88:17": { "t": "Do the disbelievers not see how rain clouds are formed <sup foot_note=\\"77646\\">1</sup>", "f": { "77646": "The word ibl can mean 'camel' as well as 'rain cloud'. However, the latter is better in this context among all the other geographical images presented. Rain is often used to illustrate the concept of resurrection." } } }
```

- **Inline Footnote Format:** In this format, footnotes are included directly within the translation text, wrapped in double square brackets. Example:


```jsx
{ "88:17": "Do the disbelievers not see how rain clouds are formed [[The word ibl can mean 'camel' as well as 'rain cloud'. However, the latter is better in this context among all the other geographical images presented. Rain is often used to illustrate the concept of resurrection.]]" }
```

- **Text Chunks Format:** In this format, the translation text is divided into chunks. Each chunk can be either a simple text string or a hash reference to footnote content. This structure is particularly useful for native apps where rendering HTML is not feasible. Example:


```jsx
{ "88:17": { "t": [ "Do the disbelievers not see how rain clouds are formed ", {"f": 1} ], "f": { "1": "The word ibl can mean 'camel' as well as 'rain cloud'. However, the latter is better in this context among all the other geographical images presented. Rain is often used to illustrate the concept of resurrection." } } }
```


[🔗](https://qul.tarteel.ai/faq#faq-11)[How can I get alerted if corrections are made to the data?](https://qul.tarteel.ai/faq#faq-11)

If you have downloaded a resource from QUL, you will receive an email notification whenever that resource is updated.

[🔗](https://qul.tarteel.ai/faq#faq-14)[Does QUL have Hadith data?](https://qul.tarteel.ai/faq#faq-14)

Currently, QUL focuses primarily on Quranic resources. While we do not offer Hadith data at this time, we plan to explore options for expanding the platform to include Hadith collections in the future. In the meantime, we recommend using [Sunnah.com](http://sunnah.com/) for reliable Hadith collections and their [API](https://sunnah.com/developers) for integrating Hadith data into your projects.

[🔗](https://qul.tarteel.ai/faq#faq-15)[Does QUL have an API?](https://qul.tarteel.ai/faq#faq-15)

Currently, QUL does not have an API. However, we recognize the potential benefits of providing API access for developers and other users who want to integrate Quranic resources into their projects. We are exploring the possibility of adding an API in the future to make it easier to access and use these resources programmatically. Stay tuned for updates as we continue to enhance QUL’s capabilities.

[🔗](https://qul.tarteel.ai/faq#faq-16)[Which Qirats are currently available on QUL?](https://qul.tarteel.ai/faq#faq-16)

All translations, Quran scripts, and recitations available on QUL are based on the **Hafs narration**. We plan to expand support to include other Qirats in the future.

[🔗](https://qul.tarteel.ai/faq#faq-3)[Are the resources in QUL copyrighted? Do I need to include attribution to an individual or organization when using them?](https://qul.tarteel.ai/faq#faq-3)

The resources available on QUL vary in their copyright status. Some are in the public domain, while others may be subject to specific licenses. We recommend reviewing the licensing information provided by each resource’s author before use.

[🔗](https://qul.tarteel.ai/faq#faq-17)[Are the translations and tafsirs included in QUL based on a specific creed or madhhab?](https://qul.tarteel.ai/faq#faq-17)

QUL is a content management system designed to facilitate the management, review, and distribution of Quranic resources.

All tafsir and translation content on QUL is sourced from trusted Sunni platforms. However, QUL does not endorse any specific creed or madhhab. Our goal is to make Quranic resources widely accessible without engaging in theological positions or interpretations.

We encourage users to consult qualified scholars or conduct their own research before using resources from QUL in their projects.

[🔗](https://qul.tarteel.ai/faq#faq-18)[What are Tools in QUL?](https://qul.tarteel.ai/faq#faq-18)

**Tools** are used to **edit, update, or submit changes** to a resource.

Tools are intended for contributors and editors who are:

- Fixing mistakes

- Improving content

- Submitting updates


Using tools **requires proper access**, because changes affect the resource itself.

If you only want to **download a resource**, you do NOT need access to tools.

[🔗](https://qul.tarteel.ai/faq#faq-8)[How can I contribute?](https://qul.tarteel.ai/faq#faq-8)

You can contribute to QUL by submitting new resources, suggesting corrections, or sharing your expertise in reviewing existing data. We also welcome developers who wish to help improve the platform.