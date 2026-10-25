# Source capture: market-muaalem-dataset

URL: https://huggingface.co/datasets/obadx/muaalem-annotated-v3
Fetched: 2026-10-15

Dataset Viewer

[Auto-converted to Parquet](https://huggingface.co/datasets/obadx/muaalem-annotated-v3/tree/refs%2Fconvert%2Fparquet/moshaf_0.0) APIEmbed [Duplicate](https://huggingface.co/datasets/obadx/muaalem-annotated-v3?duplicate=true)Data Studio

Subset (29)
moshaf\_0.0·9.13k rows
moshaf\_0.0 (9.13k rows)moshaf\_0.1 (10.8k rows)moshaf\_0.2 (9.97k rows)moshaf\_0.3 (12.6k rows)moshaf\_1.0 (10.9k rows)moshaf\_11.0 (10.4k rows)moshaf\_12.0 (9.88k rows)moshaf\_13.0 (9.38k rows)moshaf\_19.0 (11.3k rows)moshaf\_2.0 (9.94k rows)moshaf\_2.1 (10.4k rows)moshaf\_22.0 (10.3k rows)moshaf\_24.0 (9.87k rows)moshaf\_25.0 (7.92k rows)moshaf\_26.0 (11.6k rows)moshaf\_26.1 (11.9k rows)moshaf\_27.0 (11.2k rows)moshaf\_28.0 (10.5k rows)moshaf\_29.0 (11.1k rows)moshaf\_3.0 (10.4k rows)moshaf\_30.0 (11.3k rows)moshaf\_4.0 (11k rows)moshaf\_5.0 (11.5k rows)moshaf\_6.0 (12.4k rows)moshaf\_7.0 (9.91k rows)moshaf\_8.0 (10.3k rows)moshaf\_9.0 (10.6k rows)moshaf\_metadata (27 rows)reciters\_metadata (22 rows)
Split (1)

train·9.13k rows
train (9.13k rows)

SQL
Console

The dataset viewer is not available for this split.

Server error while post-processing the split rows. Please report the issue.

```
Error code:   RowsPostProcessingError
```

Need help to make the dataset viewer work? Make sure to review [how to configure the dataset viewer](https://huggingface.co/docs/hub/datasets-data-files-configuration), and [open a discussion](https://huggingface.co/datasets/obadx/muaalem-annotated-v3/discussions/new?title=Dataset+Viewer+issue%3A+RowsPostProcessingError&description=The+dataset+viewer+is+not+working.%0A%0AError+details%3A%0A%0A%60%60%60%0AError+code%3A+++RowsPostProcessingError%0A%0A%60%60%60%0A%0A%0Acc+%40lhoestq+%40cfahlgren1.) for direct support.

# قاعدة بيانات المعلم القرآنية

هذه ال dataset هي جزء من مشروع الملم الرقرآني: [quran-muaalem](https://github.com/obadx/quran-muaalem) وهي تهدف لكشف أخاطاء التجويد عن طريق رسم صوتي يصف كل قواعد التجويد وصفات الحروف: [quran-trainscript](https://github.com/obadx/quran-transcript)

## وصف قاعدة بيانات العلم

مصاحف مجمعمة من القراء المتقنين لبناء نماذج ذكاء اصطناعي لخدمة القرآن الكريم. أنظر [هنا](https://github.com/obadx/prepare-quran-dataset) لأكواد بناء قاعدة التلاوات القرآنية

[![stats](https://huggingface.co/datasets/obadx/muaalem-annotated-v3/resolve/main/stats.png)](https://huggingface.co/datasets/obadx/muaalem-annotated-v3/blob/main/stats.png)

[![reciters](https://huggingface.co/datasets/obadx/muaalem-annotated-v3/resolve/main/reciter.png)](https://huggingface.co/datasets/obadx/muaalem-annotated-v3/blob/main/reciter.png)

## البيانات الوصفية للمصاحف

```python
ds = load_dataset('obadx/muaalem-annotated-v3', name='moshaf_metadata')['train']
```

### وصف أوجه حفص

| Attribute Name | Arabic Name | Values | Default Value | More Info |
| --- | --- | --- | --- | --- |
| rewaya | الرواية | \- `hafs` (`حفص`) |  | The type of the quran Rewaya. |
| recitation\_speed | سرعة التلاوة | \- `mujawad` (`مجود`)<br>\- `above_murattal` (`فويق المرتل`)<br>\- `murattal` (`مرتل`)<br>\- `hadr` (`حدر`) | `murattal` (`مرتل`) | The recitation speed sorted from slowest to the fastest سرعة التلاوة مرتبة من الأبطأ إلي الأسرع |
| takbeer | التكبير | \- `no_takbeer` (`لا تكبير`)<br>\- `beginning_of_sharh` (`التكبير من أول الشرح لأول الناس`)<br>\- `end_of_doha` (`التكبير من آخر الضحى لآخر الناس`)<br>\- `general_takbeer` (`التكبير أول كل سورة إلا التوبة`) | `no_takbeer` (`لا تكبير`) | The ways to add takbeer (الله أكبر) after Istiaatha (استعاذة) and between end of the surah and beginning of the surah. `no_takbeer`: "لا تكبير" — No Takbeer (No proclamation of greatness, i.e., there is no Takbeer recitation) `beginning_of_sharh`: "التكبير من أول الشرح لأول الناس" — Takbeer from the beginning of Surah Ash-Sharh to the beginning of Surah An-Nas `end_of_dohaf`: "التكبير من آخر الضحى لآخر الناس" — Takbeer from the end of Surah Ad-Duha to the end of Surah An-Nas `general_takbeer`: "التكبير أول كل سورة إلا التوبة" — Takbeer at the beginning of every Surah except Surah At-Tawbah |
| madd\_monfasel\_len | مد المنفصل | \- `2`<br>\- `3`<br>\- `4`<br>\- `5` |  | The length of Mad Al Monfasel "مد النفصل" for Hafs Rewaya. |
| madd\_mottasel\_len | مقدار المد المتصل | \- `4`<br>\- `5`<br>\- `6` |  | The length of Mad Al Motasel "مد المتصل" for Hafs. |
| madd\_mottasel\_waqf | مقدار المد المتصل وقفا | \- `4`<br>\- `5`<br>\- `6` |  | The length of Madd Almotasel at pause for Hafs.. Example "السماء". |
| madd\_aared\_len | مقدار المد العارض | \- `2`<br>\- `4`<br>\- `6` |  | The length of Mad Al Aared "مد العارض للسكون". |
| madd\_alleen\_len | مقدار مد اللين | \- `2`<br>\- `4`<br>\- `6` | `None` | The length of the Madd al-Leen when stopping at the end of a word (for a sakin waw or ya preceded by a letter with a fatha) should be less than or equal to the length of Madd al-'Arid (the temporary stretch due to stopping). **Default Value is equal to `madd_aared_len`**. مقدرا مع اللين عن القوف (للواو الساكنة والياء الساكنة وقبلها حرف مفتوح) ويجب أن يكون مقدار مد اللين أقل من أو يساوي مع العارض |
| ghonna\_lam\_and\_raa | غنة اللام و الراء | \- `ghonna` (`غنة`)<br>\- `no_ghonna` (`لا غنة`) | `no_ghonna` (`لا غنة`) | The ghonna for merging (Idghaam) noon with Lam and Raa for Hafs. |
| meem\_aal\_imran | ميم آل عمران في قوله تعالى: {الم الله} وصلا | \- `waqf` (`وقف`)<br>\- `wasl_2` (`فتح الميم ومدها حركتين`)<br>\- `wasl_6` (`فتح الميم ومدها ستة حركات`) | `waqf` (`وقف`) | The ways to recite the word meem Aal Imran (الم الله) at connected recitation. `waqf`: Pause with a prolonged madd (elongation) of 6 harakat (beats). `wasl_2` Pronounce "meem" with fathah (a short "a" sound) and stretch it for 2 harakat. `wasl_6` Pronounce "meem" with fathah and stretch it for 6 harakat. |
| madd\_yaa\_alayn\_alharfy | مقدار المد اللازم الحرفي للعين | \- `2`<br>\- `4`<br>\- `6` | `6` | The length of Lzem Harfy of Yaa in letter Al-Ayen Madd "المد الحرفي اللازم لحرف العين" in surar: Maryam "مريم", AlShura "الشورى". |
| saken\_before\_hamz | الساكن قبل الهمز | \- `tahqeek` (`تحقيق`)<br>\- `general_sakt` (`سكت عام`)<br>\- `local_sakt` (`سكت خاص`) | `tahqeek` (`تحقيق`) | The ways of Hafs for saken before hamz. "The letter with sukoon before the hamzah (ء)".And it has three forms: full articulation (`tahqeeq`), general pause (`general_sakt`), and specific pause (`local_skat`). |
| sakt\_iwaja | السكت عند عوجا في الكهف | \- `sakt` (`سكت`)<br>\- `waqf` (`وقف`)<br>\- `idraj` (`إدراج`) | `waqf` (`وقف`) | The ways to recite the word "عوجا" (Iwaja). `sakt` means slight pause. `idraj` means not `sakt`. `waqf`: means full pause, so we can not determine weither the reciter uses `sakt` or `idraj` (no sakt). |
| sakt\_marqdena | السكت عند مرقدنا في يس | \- `sakt` (`سكت`)<br>\- `waqf` (`وقف`)<br>\- `idraj` (`إدراج`) | `waqf` (`وقف`) | The ways to recite the word "مرقدنا" (Marqadena) in Surat Yassen. `sakt` means slight pause. `idraj` means not `sakt`. `waqf`: means full pause, so we can not determine weither the reciter uses `sakt` or `idraj` (no sakt). |
| sakt\_man\_raq | السكت عند من راق في القيامة | \- `sakt` (`سكت`)<br>\- `waqf` (`وقف`)<br>\- `idraj` (`إدراج`) | `sakt` (`سكت`) | The ways to recite the word "من راق" (Man Raq) in Surat Al Qiyama. `sakt` means slight pause. `idraj` means not `sakt`. `waqf`: means full pause, so we can not determine weither the reciter uses `sakt` or `idraj` (no sakt). |
| sakt\_bal\_ran | السكت عند بل ران في المطففين | \- `sakt` (`سكت`)<br>\- `waqf` (`وقف`)<br>\- `idraj` (`إدراج`) | `sakt` (`سكت`) | The ways to recite the word "بل ران" (Bal Ran) in Surat Al Motaffin. `sakt` means slight pause. `idraj` means not `sakt`. `waqf`: means full pause, so we can not determine weither the reciter uses `sakt` or `idraj` (no sakt). |
| sakt\_maleeyah | وجه قوله تعالى {ماليه هلك} بالحاقة | \- `sakt` (`سكت`)<br>\- `waqf` (`وقف`)<br>\- `idgham` (`إدغام`) | `waqf` (`وقف`) | The ways to recite the word {ماليه هلك} in Surah Al-Ahqaf. `sakt` means slight pause. `idgham` Assimilation of the letter 'Ha' (ه) into the letter 'Ha' (ه) with complete assimilation.`waqf`: means full pause, so we can not determine weither the reciter uses `sakt` or `idgham`. |
| between\_anfal\_and\_tawba | وجه بين الأنفال والتوبة | \- `waqf` (`وقف`)<br>\- `sakt` (`سكت`)<br>\- `wasl` (`وصل`) | `waqf` (`وقف`) | The ways to recite end of Surah Al-Anfal and beginning of Surah At-Tawbah. |
| noon\_and\_yaseen | الإدغام والإظهار في النون عند الواو من قوله تعالى: {يس والقرآن}و {ن والقلم} | \- `izhar` (`إظهار`)<br>\- `idgham` (`إدغام`) | `izhar` (`إظهار`) | Weither to merge noon of both: {يس} and {ن} with (و) "`idgham`" or not "`izhar`". |
| yaa\_ataan | إثبات الياء وحذفها وقفا في قوله تعالى {آتان} بالنمل | \- `wasl` (`وصل`)<br>\- `hadhf` (`حذف`)<br>\- `ithbat` (`إثبات`) | `wasl` (`وصل`) | The affirmation and omission of the letter 'Yaa' in the pause of the verse {آتاني} in Surah An-Naml.`wasl`: means connected recitation without pasuding as (آتانيَ).`hadhf`: means deletion of letter (ي) at puase so recited as (آتان).`ithbat`: means confirmation reciting letter (ي) at puase as (آتاني). |
| start\_with\_ism | وجه البدأ بكلمة {الاسم} في سورة الحجرات | \- `wasl` (`وصل`)<br>\- `lism` (`لسم`)<br>\- `alism` (`ألسم`) | `wasl` (`وصل`) | The ruling on starting with the word {الاسم} in Surah Al-Hujurat.`lism` Recited as (لسم) at the beginning. `alism` Recited as (ألسم). ath the beginning`wasl`: means completing recitaion without paussing as normal, So Reciting is as (بئس لسم). |
| yabsut | السين والصاد في قوله تعالى: {والله يقبض ويبسط} بالبقرة | \- `seen` (`سين`)<br>\- `saad` (`صاد`) | `seen` (`سين`) | The ruling on pronouncing `seen` (س) or `saad` (ص) in the verse {والله يقبض ويبسط} in Surah Al-Baqarah. |
| bastah | السين والصاد في قوله تعالى: {وزادكم في الخلق بسطة} بالأعراف | \- `seen` (`سين`)<br>\- `saad` (`صاد`) | `seen` (`سين`) | The ruling on pronouncing `seen` (س) or `saad` (ص ) in the verse {وزادكم في الخلق بسطة} in Surah Al-A'raf. |
| almusaytirun | السين والصاد في قوله تعالى {أم هم المصيطرون} بالطور | \- `seen` (`سين`)<br>\- `saad` (`صاد`) | `saad` (`صاد`) | The pronunciation of `seen` (س) or `saad` (ص ) in the verse {أم هم المصيطرون} in Surah At-Tur. |
| bimusaytir | السين والصاد في قوله تعالى: {لست عليهم بمصيطر} بالغاشية | \- `seen` (`سين`)<br>\- `saad` (`صاد`) | `saad` (`صاد`) | The pronunciation of `seen` (س) or `saad` (ص ) in the verse {لست عليهم بمصيطر} in Surah Al-Ghashiyah. |
| tasheel\_or\_madd | همزة الوصل في قوله تعالى: {آلذكرين} بموضعي الأنعام و{آلآن} موضعي يونس و{آلله} بيونس والنمل | \- `tasheel` (`تسهيل`)<br>\- `madd` (`مد`) | `madd` (`مد`) | Tasheel of Madd "وجع التسهيل أو المد" for 6 words in The Holy Quran: "ءالذكرين", "ءالله", "ءائن". |
| yalhath\_dhalik | الإدغام وعدمه في قوله تعالى: {يلهث ذلك} بالأعراف | \- `izhar` (`إظهار`)<br>\- `idgham` (`إدغام`)<br>\- `waqf` (`وقف`) | `idgham` (`إدغام`) | The assimilation (`idgham`) and non-assimilation (`izhar`) in the verse {يلهث ذلك} in Surah Al-A'raf. `waqf`: means the rectier has paused on (يلهث) |
| irkab\_maana | الإدغام والإظهار في قوله تعالى: {اركب معنا} بهود | \- `izhar` (`إظهار`)<br>\- `idgham` (`إدغام`)<br>\- `waqf` (`وقف`) | `idgham` (`إدغام`) | The assimilation and clear pronunciation in the verse {اركب معنا} in Surah Hud.This refers to the recitation rules concerning whether the letter "Noon" (ن) is assimilated into the following letter or pronounced clearly when reciting this specific verse. `waqf`: means the rectier has paused on (اركب) |
| noon\_tamnna | الإشمام والروم (الاختلاس) في قوله تعالى {لا تأمنا على يوسف} | \- `ishmam` (`إشمام`)<br>\- `rawm` (`روم`) | `ishmam` (`إشمام`) | The nasalization (`ishmam`) or the slight drawing (`rawm`) in the verse {لا تأمنا على يوسف} |
| harakat\_daaf | حركة الضاد (فتح أو ضم) في قوله تعالى {ضعف} بالروم | \- `fath` (`فتح`)<br>\- `dam` (`ضم`) | `fath` (`فتح`) | The vowel movement of the letter 'Dhad' (ض) (whether with `fath` or `dam`) in the word {ضعف} in Surah Ar-Rum. |
| alif\_salasila | إثبات الألف وحذفها وقفا في قوله تعالى: {سلاسلا} بسورة الإنسان | \- `hadhf` (`حذف`)<br>\- `ithbat` (`إثبات`)<br>\- `wasl` (`وصل`) | `wasl` (`وصل`) | Affirmation and omission of the 'Alif' when pausing in the verse {سلاسلا} in Surah Al-Insan.This refers to the recitation rule regarding whether the final "Alif" in the word "سلاسلا" is pronounced (affirmed) or omitted when pausing (waqf) at this word during recitation in the specific verse from Surah Al-Insan. `hadhf`: means to remove alif (ا) during puase as (سلاسل) `ithbat`: means to recite alif (ا) during puase as (سلاسلا) `wasl` means completing the recitation as normal without pausing, so recite it as (سلاسلَ وأغلالا) |
| idgham\_nakhluqkum | إدغام القاف في الكاف إدغاما ناقصا أو كاملا {نخلقكم} بالمرسلات | \- `idgham_kamil` (`إدغام كامل`)<br>\- `idgham_naqis` (`إدغام ناقص`) | `idgham_kamil` (`إدغام كامل`) | Assimilation of the letter 'Qaf' into the letter 'Kaf,' whether incomplete (`idgham_naqis`) or complete (`idgham_kamil`), in the verse {نخلقكم} in Surah Al-Mursalat. |
| raa\_firq | التفخيم والترقيق في راء {فرق} في الشعراء وصلا | \- `waqf` (`وقف`)<br>\- `tafkheem` (`تفخيم`)<br>\- `tarqeeq` (`ترقيق`) | `tafkheem` (`تفخيم`) | Emphasis and softening of the letter 'Ra' in the word {فرق} in Surah Ash-Shu'ara' when connected (wasl).This refers to the recitation rules concerning whether the letter "Ra" (ر) in the word "فرق" is pronounced with emphasis (`tafkheem`) or softening (`tarqeeq`) when reciting the specific verse from Surah Ash-Shu'ara' in connected speech. `waqf`: means pasuing so we only have one way (tafkheem of Raa) |
| raa\_alqitr | التفخيم والترقيق في راء {القطر} في سبأ وقفا | \- `wasl` (`وصل`)<br>\- `tafkheem` (`تفخيم`)<br>\- `tarqeeq` (`ترقيق`) | `wasl` (`وصل`) | Emphasis and softening of the letter 'Ra' in the word {القطر} in Surah Saba' when pausing (waqf).This refers to the recitation rules regarding whether the letter "Ra" (ر) in the word "القطر" is pronounced with emphasis (`tafkheem`) or softening (`tarqeeq`) when pausing at this word in Surah Saba'. `wasl`: means not pasuing so we only have one way (tarqeeq of Raa) |
| raa\_misr | التفخيم والترقيق في راء {مصر} في يونس وموضعي يوسف والزخرف وقفا | \- `wasl` (`وصل`)<br>\- `tafkheem` (`تفخيم`)<br>\- `tarqeeq` (`ترقيق`) | `wasl` (`وصل`) | Emphasis and softening of the letter 'Ra' in the word {مصر} in Surah Yunus, and in the locations of Surah Yusuf and Surah Az-Zukhruf when pausing (waqf).This refers to the recitation rules regarding whether the letter "Ra" (ر) in the word "مصر" is pronounced with emphasis (`tafkheem`) or softening (`tarqeeq`) at the specific pauses in these Surahs. `wasl`: means not pasuing so we only have one way (tafkheem of Raa) |
| raa\_nudhur | التفخيم والترقيق في راء {نذر} بالقمر وقفا | \- `wasl` (`وصل`)<br>\- `tafkheem` (`تفخيم`)<br>\- `tarqeeq` (`ترقيق`) | `tafkheem` (`تفخيم`) | Emphasis and softening of the letter 'Ra' in the word {نذر} in Surah Al-Qamar when pausing (waqf).This refers to the recitation rules regarding whether the letter "Ra" (ر) in the word "نذر" is pronounced with emphasis (`tafkheem`) or softening (`tarqeeq`) when pausing at this word in Surah Al-Qamar. `wasl`: means not pasuing so we only have one way (tarqeeq of Raa) |
| raa\_yasr | التفخيم والترقيق في راء {يسر} بالفجر و{أن أسر} بطه والشعراء و{فأسر} بهود والحجر والدخان وقفا | \- `wasl` (`وصل`)<br>\- `tafkheem` (`تفخيم`)<br>\- `tarqeeq` (`ترقيق`) | `tarqeeq` (`ترقيق`) | Emphasis and softening of the letter 'Ra' in the word {يسر} in Surah Al-Fajr when pausing (waqf).This refers to the recitation rules regarding whether the letter "Ra" (ر) in the word "يسر" is pronounced with emphasis (`tafkheem`) or softening (`tarqeeq`) when pausing at this word in Surah Al-Fajr. `wasl`: means not pasuing so we only have one way (tarqeeq of Raa) |
| meem\_mokhfah | هل الميم مخفاة أو مدغمة | \- `meem` (`ميم`)<br>\- `ikhfaa` (`إخفاء`) | `ikhfaa` (`إخفاء`) | This is not a **standard** Hafs way but a disagreement between **scholars** in our century on how to **pronounce** **Ikhfa** for meem. Some **scholars** do full merging (`إدغام`) and the others open the **lips** a little bit (`إخفاء`). We did not want to add this, but some of the best reciters disagree about this. |

## البيانات الوصفية للقراء

```python
ds = load_dataset('obadx/muaalem-annotated-v3', name='reciters_metadata')['train']
```

## المصحاف

للتسهيل على الباحثن تحميل البيانات قمنا بتقسيمها على هيئة مصاحف. واسم كل مصحف بال `id` في `moshaf_metadata`.

```python
moshaf_id = "0.0"
ds = load_dataset('obadx/muaalem-annotated-v3', name=f"moshaf_{moshaf_id}", split='train')
```

### هيكل وميزات مجموعة البيانات الصوتية للقرآن الكريم

تتكون كل عينة في مجموعة البيانات من المقاطع التالية:

#### 🎵 البيانات الصوتية

- **audio**: الملف الصوتي (تنسيق Audio)
  - معدل العينة: 16000 هرتز
  - قناة واحدة (Mono)
  - مع فك الترميز (Decode)

#### 🔖 معلومات التعريف

- **segment\_index**: معرف فريد للمقطع (نصي)
- **moshaf\_id**: معرّف المصحف
- **moshaf\_name**: اسم المصحف
- **reciter\_id**: معرّف القارئ (رقم صحيح)
- **reciter\_arabic\_name**: اسم القارئ بالعربية
- **reciter\_english\_name**: اسم القارئ بالإنجليزية

#### 📖 معلومات النص المقروء

- **sura\_or\_aya\_index**: رقم السورة أو الآية
- **index\_type**: نوع الفهرس (سورة أو آية)
- **tarteel\_transcript**: النص المقروء (سلسلة نصية)

#### ⏱️ معلومات زمنية

- **sample\_rate**: معدل العينة (عدد صحيح)
- **duration\_seconds**: مدة المقطع بالثواني (رقم عشري)
- **timestamp\_seconds**: الطوابع الزمنية للمقطع (مصفوفة أرقام)

#### 📜 نصوص القرآن بأنواعها

- **imlaey**: النص الإملائي
- **uthmani**: النص العثماني

#### 🕌 معلومات إضافية عن التلاوة

- **has\_quran**: هل يحتوي على قرآن؟ (قيمة منطقية)
- **has\_istiaatha**: هل يحتوي على استعاذة؟ (قيمة منطقية)
- **has\_bismillah**: هل يحتوي على بسملة؟ (قيمة منطقية)
- **has\_sadaka**: هل يحتوي على صدقة؟ (قيمة منطقية)

#### 🔍 نطاق التلاوة

- **start\_span**: بداية النطاق

  - `sura_idx`: رقم السورة
  - `aya_idx`: رقم الآية
  - `imlaey`: الفهرس الإملائي
  - `uthmani`: الفهرس العثماني
- **end\_span**: نهاية النطاق

  - (بنفس حقول start\_span)

#### 📊 مقاييس الجودة

- **match\_ratio**: نسبة التطابق (رقم عشري)

#### 🔤 الرسم الصوتي للقرآن

قمنا باستخراج الحروف الصوتية للقرآن باستخدام: [quran-transcript](https://github.com/obadx/quran-transcript)

- **phonemes**: الوحدات الصوتية (نصي)
- **sifat**: صفات التلاوة (قائمة من القواميس) وتشمل:
  - `ghonna`: الغنّة
  - `hams_or_jahr`: الهمس أو الجهر
  - `istitala`: الاستطالة
  - `itbaq`: الإطباق
  - `phonemes`: الوحدات الصوتية
  - `qalqla`: القلقلة
  - `safeer`: الصفير
  - `shidda_or_rakhawa`: الشدة أو الرخاوة
  - `tafashie`: التضخي
  - `tafkheem_or_taqeeq`: التفخيم أو الترقيق
  - `tikraar`: التكرار

### إحصاءات

| Moshaf ID | Hours | Length |
| --- | --- | --- |
| 0.0 | 28.47721296 | 9133 |
| 0.1 | 40.31257093 | 10764 |
| 0.2 | 49.46541671 | 9971 |
| 0.3 | 37.18758118 | 12604 |
| 1.0 | 28.40784367 | 10939 |
| 2.0 | 51.04665234 | 9942 |
| 2.1 | 30.02847051 | 10394 |
| 3.0 | 25.19377593 | 10444 |
| 4.0 | 29.12333379 | 10994 |
| 5.0 | 28.01777693 | 11482 |
| 6.0 | 39.38568468 | 12435 |
| 7.0 | 28.25627201 | 9907 |
| 8.0 | 30.85935158 | 10330 |
| 9.0 | 27.95178738 | 10642 |
| 11.0 | 24.00685052 | 10363 |
| 12.0 | 33.42429862 | 9880 |
| 13.0 | 33.99108879 | 9377 |
| 19.0 | 30.11410843 | 11278 |
| 22.0 | 28.10947704 | 10332 |
| 24.0 | 28.51243509 | 9868 |
| 25.0 | 16.92910042 | 7922 |
| 26.0 | 30.44461112 | 11565 |
| 26.1 | 32.71190443 | 11850 |
| 27.0 | 28.05097968 | 11213 |
| 28.0 | 31.05318768 | 10535 |
| 29.0 | 27.78900316 | 11061 |
| 30.0 | 29.14366461 | 11312 |
| **Total** | **847.9944402** | **286537** |

[![audio_lens](https://huggingface.co/datasets/obadx/muaalem-annotated-v3/resolve/main/histogram_all_lengths.png)](https://huggingface.co/datasets/obadx/muaalem-annotated-v3/blob/main/histogram_all_lengths.png)

Copy to bucket new

Use this dataset

Downloads last month

4,346

Number of rows:

286,586

Total file size:

97.3 GB

## Models trained or fine-tuned on obadx/muaalem-annotated-v3

[Automatic Speech Recognition • 0.6B•Updated Sep 4, 2025• 23.2k• 11](https://huggingface.co/obadx/muaalem-model-v3_2)

[Automatic Speech Recognition •Updated Aug 15• 2.04k• 30](https://huggingface.co/Muno459/fastconformer-quran)

[Automatic Speech Recognition •Updated Aug 15• 54• 15](https://huggingface.co/Muno459/zipformer_p-quran)

[Automatic Speech Recognition •Updated Aug 5• 41• 16](https://huggingface.co/Muno459/fastconformer-quran-streaming)

[Automatic Speech Recognition • 0.6B•Updated 29 days ago• 26](https://huggingface.co/nour-world/muaalem-model-v3_1)

[Automatic Speech Recognition • 0.6B•Updated Sep 4, 2025• 24](https://huggingface.co/obadx/muaalem-model-v3_1)

[Browse 12 models trained on this dataset](https://huggingface.co/models?dataset=dataset:obadx/muaalem-annotated-v3)