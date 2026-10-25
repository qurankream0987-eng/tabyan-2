import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tabyan_smart_mushaf/reader/reader_screen.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('manual hide/reveal works and page controls move to page 2',
      (tester) async {
    await tester.binding.setSurfaceSize(const Size(402, 1100));
    await tester.pumpWidget(const MaterialApp(home: ReaderScreen()));
    await tester.pumpAndSettle();

    expect(find.text('صفحة 1 من 604'), findsOneWidget);
    expect(find.text('كشف الكلمة التالية'), findsNothing);

    await tester.tap(find.text('إخفاء الكلمات للحفظ'));
    await tester.pumpAndSettle();
    expect(find.text('كشف الكلمة التالية'), findsOneWidget);

    await tester.tap(find.text('كشف الكلمة التالية'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('إظهار الصفحة'));
    await tester.pumpAndSettle();
    expect(find.text('كشف الكلمة التالية'), findsNothing);

    await tester.tap(find.byTooltip('الصفحة التالية'));
    await tester.pumpAndSettle();
    expect(find.text('صفحة 2 من 604'), findsOneWidget);
    expect(find.text('سُورَةُ البقرة'), findsOneWidget);

    await tester.binding.setSurfaceSize(null);
  });
}
