# Source capture: market-alqurancloud-api

URL: https://alquran.cloud/api
Fetched: 2026-10-15

v1

OpenAPI 3.1.0

# بِسْمِ اللهِ الرَّحْمٰنِ الرَّحِيْمِ

Download OpenAPI Document
yaml

**AlQuran API**

**The Holy Quran is a divine book from Allah SWT.**

**You can get the text for complete edition, search words in text using the endpoints below.**

Server

Server:https://api.alquran.cloud/v1

Client Libraries

Shell

Ruby

Node.js

PHP

Python

More Select from all clients

Shell Curl

## Ayah

​Copy link

Ayah Operations

- get/ayah/random
- get/ayah/random/{edition}
- get/ayah/random/editions/{editions}
- get/ayah/{number}
- get/ayah/{number}/{edition}
- get/ayah/{number}/editions/{editions}

### Single Ayah randomly

​Copy link

Returns a single Ayah and its details randomly

Headers

- Accept-EncodingCopy link to Accept-Encoding



Type: string







Content Encoding for compression. Supported values are "gzip" or "zstd".


Responses

- 200







Returns a single Ayah and its details randomly











application/json

- 404







Unable to find the requested resource











application/json


Request Example for get/ayah/random

Shell Curl

```curl
curl https://api.alquran.cloud/v1/ayah/random \
  --header 'Accept-Encoding: '
```

cURLCopy

cURLCopy

Test Request(get /ayah/random)

Status: 200Status: 404

Show Schema

```json
{
  "code": 200,
  "status": "OK",
  "data": {
    "number": 5,
    "text": "إِیَّاكَ نَعۡبُدُ وَإِیَّاكَ نَسۡتَعِینُ",
    "edition": {
      "identifier": "quran-uthmani-quran-academy",
      "language": "ar",
      "name": "القرآن الكريم برسم العثماني (quran-academy)",
      "englishName": "Modified Quran Uthmani Text from the Quran Academy to work with the Kitab font",
      "format": "text",
      "type": "quran",
      "direction": "rtl"
    },
    "surah": {
      "number": 1,
      "name": "سُورَةُ ٱلْفَاتِحَةِ",
      "englishName": "Al-Faatiha",
      "englishNameTranslation": "The Opening",
      "numberOfAyahs": 7,
      "revelationType": "Meccan"
    },
    "numberInSurah": 5,
    "juz": 1,
    "manzil": 1,
    "page": 1,
    "ruku": 1,
    "hizbQuarter": 1,
    "sajda": false
  }
}
```

JSONCopy

JSONCopy

Returns a single Ayah and its details randomly

Show sidebar

GET

Server: https://api.alquran.cloud/v1

/ayah/random

Copy URL

Send Send get request to https://api.alquran.cloud/v1/ayah/random

GET

Copy URLSend Send get request to https://api.alquran.cloud/v1/ayah/random

[Open API Client](https://client.scalar.com/?url=https%3A%2F%2Fapi.alquran.cloud%2Fv1%2Fdocumentation%2Fopenapi%2Fyaml&operation_path=%2Fayah%2Frandom&operation_method=get&utm_source=api-reference&utm_medium=button&utm_campaign=modal) Close Client

Single Ayah randomly

AllCookiesHeadersQuery

All

## Authentication  (Collapsed)

Select Auth Type

## Variables

| Enabled | Key | Value |
| --- | --- | --- |

## Cookies

| Enabled | Key | Value |
| --- | --- | --- |
|  | Key | Value |

## Headers

Clear All Headers

| Enabled | Key | Value |
| --- | --- | --- |
|  | accept | application/json |
|  | Accept-Encoding | Value |
|  | Key | Value |

## Query Parameters

| Enabled | Key | Value |
| --- | --- | --- |
|  | Key | Value |

## Request Body

No Body

| None |
| --- |

## Code Snippet (Collapsed)

Shell Curl

Response

AllCookiesHeadersBody

All

[Powered By Scalar.com](https://www.scalar.com/)

.,,uod8B8bou,,. ..,uod8BBBBBBBBBBBBBBBBRPFT?l!i:. \|\|\|\|\|\|\|\|\|\|\|\|\|\|!?TFPRBBBBBBBBBBBBBBB8m=, \|\|\|\| '""^^!!\|\|\|\|\|\|\|\|\|\|TFPRBBBVT!:...! \|\|\|\| '""^^!!\|\|\|\|\|?!:.......! \|\|\|\| \|\|\|\|.........! \|\|\|\| \|\|\|\|.........! \|\|\|\| \|\|\|\|.........! \|\|\|\| \|\|\|\|.........! \|\|\|\| \|\|\|\|.........! \|\|\|\| \|\|\|\|.........! \|\|\|\|, \|\|\|\|.........\` \|\|\|\|\|!!-.\_ \|\|\|\|.......;. ':!\|\|\|\|\|\|\|\|\|!!-.\_ \|\|\|\|.....bBBBBWdou,. bBBBBB86foi!\|\|\|\|\|\|\|!!-..:\|\|\|!..bBBBBBBBBBBBBBBY! ::!?TFPRBBBBBB86foi!\|\|\|\|\|\|\|\|!!bBBBBBBBBBBBBBBY..! :::::::::!?TFPRBBBBBB86ftiaabBBBBBBBBBBBBBBY....! :::;\`"^!:;::::::!?TFPRBBBBBBBBBBBBBBBBBBBY......! ;::::::...''^::::::::::!?TFPRBBBBBBBBBBY........! .ob86foi;::::::::::::::::::::::::!?TFPRBY..........\` .b888888888886foi;:::::::::::::::::::::::..........\` .b888888888888888888886foi;::::::::::::::::...........b888888888888888888888888888886foi;:::::::::......\`!Tf998888888888888888888888888888888886foi;:::....\` '"^!\|Tf9988888888888888888888888888888888!::..\` '"^!\|Tf998888888888888888888888889!! '\` '"^!\|Tf9988888888888888888!!\` iBBbo. '"^!\|Tf998888888889!\` WBBBBbo. '"^!\|Tf9989!\` YBBBP^' '"^!\` \`

Send Request

ctrlControl

↵Enter

Tap any āyah ▷ to beginready · Alafasy

A