import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../qcf/qcf_page_data.dart';
import '../qcf/surah_names.dart';

const _paperAspectRatio = 622 / 917;
const _lineCount = 15;
const _paperInsetRatio = 0.015;
const _denseInkRatio = 0.53;
const _basmalah = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
class QcfPageCanvas extends StatelessWidget {
  const QcfPageCanvas({
    required this.data,
    required this.hideWords,
    required this.revealedWords,
    required this.onSwipeNext,
    required this.onSwipePrevious,
    super.key,
  });

  final QcfPageData data;
  final bool hideWords;
  final Map<String, int> revealedWords;
  final VoidCallback onSwipeNext;
  final VoidCallback onSwipePrevious;

  String get _fontFamily => 'QcfPage${data.page}';
  bool get _isOpening => data.page == 1 || data.page == 2;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final width = constraints.maxWidth;
        final height = width / _paperAspectRatio;
        final lines = data.buildLines();
        final rowCount = math.max(1, lines.fold<int>(0, (value, line) => math.max(value, line.number)));
        final wordRowHeight = height * (1 - _paperInsetRatio * 2) / _lineCount;
        final titleRowHeight = height / _lineCount;
        final topByLine = _computeTops(
          lines: lines,
          rowCount: rowCount,
          height: height,
          wordRowHeight: wordRowHeight,
          titleRowHeight: titleRowHeight,
        );
        final fontSize = _fitFontSize(
          lines: lines,
          width: width,
          height: height,
          wordRowHeight: wordRowHeight,
        );

        return GestureDetector(
          onHorizontalDragEnd: (details) {
            final velocity = details.primaryVelocity ?? 0;
            if (velocity < -250) onSwipeNext();
            if (velocity > 250) onSwipePrevious();
          },
          child: Container(
            width: width,
            height: height,
            clipBehavior: Clip.hardEdge,
            decoration: BoxDecoration(
              color: const Color(0xFFFFFCF5),
              border: Border.all(color: const Color(0xFFD4AF37), width: 1.2),
              borderRadius: BorderRadius.circular(8),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x1F360512),
                  blurRadius: 18,
                  offset: Offset(0, 7),
                ),
              ],
            ),
            child: Stack(
              children: [
                for (final line in lines)
                  _buildLine(
                    line: line,
                    top: topByLine[line.number] ?? 0,
                    rowHeight: line.kind == QcfLineKind.surahHeader
                        ? titleRowHeight
                        : wordRowHeight,
                    fontSize: fontSize,
                    data: data,
                  ),
                if (_isOpening)
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 5,
                    child: Center(
                      child: Text(
                        _arabicDigits(data.page),
                        style: const TextStyle(
                          color: Color(0xFF800020),
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Map<int, double> _computeTops({
    required List<QcfPageLine> lines,
    required int rowCount,
    required double height,
    required double wordRowHeight,
    required double titleRowHeight,
  }) {
    final tops = <int, double>{};
    if (!_isOpening || lines.isEmpty) {
      final inset = height * _paperInsetRatio;
      for (final line in lines) {
        tops[line.number] = inset + (line.number - 1) * wordRowHeight;
      }
      return tops;
    }

    final kindByLine = {for (final line in lines) line.number: line.kind};
    final firstLine = lines.map((line) => line.number).reduce(math.min);
    var offset = 0.0;
    for (var line = firstLine; line <= rowCount; line++) {
      tops[line] = height * _paperInsetRatio + offset;
      final kind = kindByLine[line];
      if (kind == QcfLineKind.surahHeader) {
        offset += titleRowHeight + wordRowHeight * 0.2;
      } else if (kind == QcfLineKind.basmalah) {
        offset += wordRowHeight * 1.2;
      } else {
        offset += wordRowHeight;
      }
    }
    return tops;
  }

  double _fitFontSize({
    required List<QcfPageLine> lines,
    required double width,
    required double height,
    required double wordRowHeight,
  }) {
    var maxLineWidth = 0.0;
    for (final line in lines.where((line) => line.kind == QcfLineKind.words)) {
      final children = <InlineSpan>[];
      for (var i = 0; i < line.words.length; i++) {
        if (i > 0) children.add(const TextSpan(text: ' '));
        children.add(TextSpan(text: line.words[i].glyph));
      }
      final painter = TextPainter(
        text: TextSpan(
          style: TextStyle(fontFamily: _fontFamily, fontSize: 100),
          children: children,
        ),
        textDirection: TextDirection.rtl,
        maxLines: 1,
      )..layout(maxWidth: width * 4);
      maxLineWidth = math.max(maxLineWidth, painter.width);
    }

    if (maxLineWidth == 0) return height / _lineCount * 0.5;
    final fitted = (width * 0.94 * 100) / maxLineWidth;
    return _isOpening ? math.min(fitted, wordRowHeight * _denseInkRatio) : fitted;
  }

  Widget _buildLine({
    required QcfPageLine line,
    required double top,
    required double rowHeight,
    required double fontSize,
    required QcfPageData data,
  }) {
    switch (line.kind) {
      case QcfLineKind.surahHeader:
        final title = surahNames[line.chapter] ?? 'سورة';
        return Positioned(
          left: 8,
          right: 8,
          top: top,
          height: rowHeight,
          child: Center(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 340),
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 5),
              decoration: BoxDecoration(
                color: const Color(0xFF800020),
                border: Border.all(color: const Color(0xFFD4AF37), width: 1),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Text(
                'سُورَةُ $title',
                textDirection: TextDirection.rtl,
                style: const TextStyle(
                  color: Color(0xFFF1D27A),
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        );
      case QcfLineKind.basmalah:
        return Positioned(
          left: 0,
          right: 0,
          top: top,
          height: rowHeight,
          child: Center(
            child: Text(
              _basmalah,
              textDirection: TextDirection.rtl,
              style: TextStyle(
                color: const Color(0xFF201512),
                fontSize: math.min(fontSize * 1.1, rowHeight * 0.62),
                height: 1,
              ),
            ),
          ),
        );
      case QcfLineKind.words:
        final positions = data.wordPositionsByVerse();
        return Positioned(
          left: 0,
          right: 0,
          top: top,
          height: rowHeight,
          child: Center(
            child: Text.rich(
              TextSpan(
                style: TextStyle(
                  color: const Color(0xFF15110F),
                  fontFamily: _fontFamily,
                  fontSize: fontSize,
                  height: 1,
                ),
                children: [
                  for (var i = 0; i < line.words.length; i++) ...[
                    if (i > 0) const TextSpan(text: ' '),
                    TextSpan(
                      text: line.words[i].glyph,
                      style: TextStyle(
                        color: _wordColor(line.words[i], positions),
                      ),
                    ),
                  ],
                ],
              ),
              textDirection: TextDirection.rtl,
              textAlign: TextAlign.center,
              maxLines: 1,
              softWrap: false,
            ),
          ),
        );
    }
  }

  Color _wordColor(QcfWord word, Map<String, List<int>> positions) {
    if (!hideWords || !word.isWord) return const Color(0xFF15110F);
    final versePositions = positions[word.verseKey] ?? const <int>[];
    final visibleCount = revealedWords[word.verseKey] ?? 0;
    final index = versePositions.indexOf(word.position);
    return index >= 0 && index < visibleCount
        ? const Color(0xFF15110F)
        : const Color(0x0015110F);
  }

  String _arabicDigits(int value) =>
      value.toString().replaceAll('0', '٠').replaceAll('1', '١').replaceAll('2', '٢')
          .replaceAll('3', '٣').replaceAll('4', '٤').replaceAll('5', '٥')
          .replaceAll('6', '٦').replaceAll('7', '٧').replaceAll('8', '٨')
          .replaceAll('9', '٩');
}
