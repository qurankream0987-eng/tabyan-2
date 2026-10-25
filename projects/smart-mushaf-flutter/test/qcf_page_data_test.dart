import 'package:flutter_test/flutter_test.dart';
import 'package:tabyan_smart_mushaf/qcf/qcf_page_repository.dart';
import 'package:tabyan_smart_mushaf/qcf/qcf_page_data.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final repository = QcfPageRepository();

  test('page 1 keeps the supplied QCF v2 glyphs and line assignments', () async {
    final page = await repository.loadPage(1);
    final lines = page.buildLines();

    expect(page.page, 1);
    expect(page.verses.first.key, '1:1');
    expect(page.verses.first.words.first.glyph, 'ﱁ');
    expect(lines.first.kind, QcfLineKind.surahHeader);
    expect(lines.first.number, 1);
    expect(
      lines.where((line) => line.kind == QcfLineKind.words).map((line) => line.number),
      [2, 3, 4, 5, 6, 7, 8],
    );
  });

  test('opening Al-Baqarah inserts its header and basmalah before line 3', () async {
    final page = await repository.loadPage(2);
    final lines = page.buildLines();

    expect(lines[0].kind, QcfLineKind.surahHeader);
    expect(lines[0].number, 1);
    expect(lines[1].kind, QcfLineKind.basmalah);
    expect(lines[1].number, 2);
    expect(lines[2].kind, QcfLineKind.words);
    expect(lines[2].number, 3);
  });

  test('At-Tawbah has a surah header but no separately inserted basmalah', () async {
    final page = await repository.loadPage(187);
    final lines = page.buildLines();

    expect(lines.first.kind, QcfLineKind.surahHeader);
    expect(lines.first.number, 1);
    expect(lines.any((line) => line.kind == QcfLineKind.basmalah), isFalse);
    expect(lines[1].kind, QcfLineKind.words);
    expect(lines[1].number, 2);
  });

  test('page 604 keeps the final three surah headers in their reserved lines', () async {
    final page = await repository.loadPage(604);
    final headers = page
        .buildLines()
        .where((line) => line.kind == QcfLineKind.surahHeader)
        .toList();

    expect(headers.map((line) => line.chapter), [112, 113, 114]);
    expect(headers.map((line) => line.number), [1, 5, 10]);
  });

  test('pages outside the 1–604 Mushaf range fail explicitly', () {
    expect(repository.loadPage(605), throwsRangeError);
  });

  test('non-fixture pages fail explicitly when no asset source is configured', () {
    expect(
      repository.loadPage(3),
      throwsA(isA<StateError>()),
    );
  });
}
