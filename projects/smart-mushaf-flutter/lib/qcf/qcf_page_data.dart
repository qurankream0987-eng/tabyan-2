enum QcfLineKind { words, surahHeader, basmalah }

class QcfWord {
  const QcfWord({
    required this.position,
    required this.line,
    required this.type,
    required this.glyph,
    required this.verseKey,
    required this.chapter,
    required this.verseNumber,
  });

  final int position;
  final int line;
  final int type;
  final String glyph;
  final String verseKey;
  final int chapter;
  final int verseNumber;

  bool get isWord => type == 0;
}

class QcfVerse {
  const QcfVerse({
    required this.key,
    required this.number,
    required this.chapter,
    required this.words,
  });

  final String key;
  final int number;
  final int chapter;
  final List<QcfWord> words;
}

class QcfPageLine {
  const QcfPageLine({
    required this.number,
    required this.kind,
    this.words = const [],
    this.chapter,
  });

  final int number;
  final QcfLineKind kind;
  final List<QcfWord> words;
  final int? chapter;
}

class QcfPageData {
  const QcfPageData({
    required this.page,
    required this.juz,
    required this.hizb,
    required this.verses,
  });

  final int page;
  final int juz;
  final int? hizb;
  final List<QcfVerse> verses;

  factory QcfPageData.fromJson(Map<String, dynamic> json) {
    final page = (json['p'] as num).toInt();
    final versesJson = json['v'] as List<dynamic>;
    final verses = versesJson.map((item) {
      final verse = item as Map<String, dynamic>;
      final chapter = (verse['c'] as num).toInt();
      final number = (verse['n'] as num).toInt();
      final key = verse['k'] as String;
      final words = (verse['w'] as List<dynamic>).map((item) {
        final tuple = item as List<dynamic>;
        return QcfWord(
          position: (tuple[0] as num).toInt(),
          line: (tuple[1] as num).toInt(),
          type: (tuple[2] as num).toInt(),
          glyph: tuple[3] as String,
          verseKey: key,
          chapter: chapter,
          verseNumber: number,
        );
      }).toList(growable: false);

      return QcfVerse(
        key: key,
        number: number,
        chapter: chapter,
        words: words,
      );
    }).toList(growable: false);

    return QcfPageData(
      page: page,
      juz: (json['j'] as num).toInt(),
      hizb: (json['h'] as num?)?.toInt(),
      verses: verses,
    );
  }

  /// Rebuilds the QCF rows without reshaping, normalizing, or reordering glyphs.
  List<QcfPageLine> buildLines() {
    final rows = <int, QcfPageLine>{};
    final wordsByLine = <int, List<QcfWord>>{};

    for (final verse in verses) {
      for (final word in verse.words) {
        wordsByLine.putIfAbsent(word.line, () => <QcfWord>[]).add(word);
      }

      if (verse.number == 1 && verse.words.isNotEmpty) {
        final firstWordLine = verse.words.first.line;
        final hasNoSeparateBasmalah = verse.chapter == 1 || verse.chapter == 9;
        final headerLine = firstWordLine - (hasNoSeparateBasmalah ? 1 : 2);
        if (headerLine >= 1) {
          rows[headerLine] = QcfPageLine(
            number: headerLine,
            kind: QcfLineKind.surahHeader,
            chapter: verse.chapter,
          );
          if (!hasNoSeparateBasmalah) {
            rows[headerLine + 1] = QcfPageLine(
              number: headerLine + 1,
              kind: QcfLineKind.basmalah,
              chapter: verse.chapter,
            );
          }
        }
      }
    }

    for (final entry in wordsByLine.entries) {
      rows[entry.key] = QcfPageLine(
        number: entry.key,
        kind: QcfLineKind.words,
        words: List.unmodifiable(entry.value),
      );
    }

    final result = rows.values.toList()
      ..sort((a, b) => a.number.compareTo(b.number));
    return List.unmodifiable(result);
  }

  Map<String, List<int>> wordPositionsByVerse() {
    final positions = <String, List<int>>{};
    for (final verse in verses) {
      final wordPositions = verse.words
          .where((word) => word.isWord)
          .map((word) => word.position)
          .toList(growable: false);
      if (wordPositions.isNotEmpty) positions[verse.key] = wordPositions;
    }
    return positions;
  }
}
