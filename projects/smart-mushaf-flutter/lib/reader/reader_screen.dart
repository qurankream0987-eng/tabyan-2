import 'package:flutter/material.dart';

import '../qcf/qcf_page_repository.dart';
import '../qcf/qcf_page_data.dart';
import 'qcf_page_canvas.dart';

class ReaderScreen extends StatefulWidget {
  const ReaderScreen({super.key});

  @override
  State<ReaderScreen> createState() => _ReaderScreenState();
}

class _ReaderScreenState extends State<ReaderScreen> {
  final _repository = QcfPageRepository();

  final Map<int, Future<QcfPageData>> _pages = {};
  final Map<String, int> _revealedWords = {};
  late int _currentPage;
  bool _hideWords = false;

  @override
  void initState() {
    super.initState();
    final requestedPage = int.tryParse(Uri.base.queryParameters['page'] ?? '');
    _currentPage = requestedPage != null &&
            requestedPage >= 1 &&
            requestedPage <= QcfPageRepository.totalPages
        ? requestedPage
        : 1;
  }

  Future<QcfPageData> _loadPage(int page) =>
      _pages.putIfAbsent(page, () => _repository.loadPage(page));

  void _selectPage(int page) {
    if (page < 1 || page > QcfPageRepository.totalPages) return;
    setState(() {
      _currentPage = page;
      _revealedWords.clear();
    });
  }

  void _toggleHide(bool value, QcfPageData page) {
    setState(() {
      _hideWords = value;
      _revealedWords
        ..clear()
        ..addEntries(
          value
              ? page.wordPositionsByVerse().entries.map(
                  (entry) => MapEntry(entry.key, 1),
                )
              : const <MapEntry<String, int>>[],
        );
    });
  }

  void _revealNext(QcfPageData page) {
    final positions = page.wordPositionsByVerse();
    setState(() {
      for (final entry in positions.entries) {
        final current = _revealedWords[entry.key] ?? 0;
        if (current < entry.value.length) {
          _revealedWords[entry.key] = current + 1;
        }
      }
    });
  }

  void _revealAll(QcfPageData page) {
    setState(() {
      _hideWords = false;
      _revealedWords.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final page = _currentPage;
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'مصحف تبيان الذكي',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        leading: const Icon(Icons.menu_book_rounded),
      ),
      body: SafeArea(
        top: false,
        child: FutureBuilder<QcfPageData>(
          future: _loadPage(page),
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'تعذّر تحميل صفحة المعاينة: ${snapshot.error}',
                    textAlign: TextAlign.center,
                  ),
                ),
              );
            }
            if (!snapshot.hasData) {
              return const Center(
                child: CircularProgressIndicator(color: Color(0xFF800020)),
              );
            }
            final data = snapshot.data!;

            return LayoutBuilder(
              builder: (context, constraints) {
                final pageWidth = (constraints.maxWidth - 24)
                    .clamp(280.0, 720.0)
                    .toDouble();

                return ListView(
                  padding: const EdgeInsets.fromLTRB(12, 14, 12, 24),
                  children: [
                    _PrototypeNotice(page: page),
                    const SizedBox(height: 12),
                    Center(
                      child: SizedBox(
                        width: pageWidth,
                        child: QcfPageCanvas(
                          data: data,
                          hideWords: _hideWords,
                          revealedWords: _revealedWords,
                          onSwipeNext: () => _selectPage(_currentPage + 1),
                          onSwipePrevious: () => _selectPage(_currentPage - 1),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    _PageControls(
                      page: page,
                      onPrevious: () => _selectPage(_currentPage - 1),
                      onNext: () => _selectPage(_currentPage + 1),
                    ),
                    const SizedBox(height: 10),
                    _MemorizationControls(
                      hideWords: _hideWords,
                      onHideChanged: (value) => _toggleHide(value, data),
                      onRevealNext: () => _revealNext(data),
                      onRevealAll: () => _revealAll(data),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'الإظهار هنا يدوي للاختبار فقط؛ لا يوجد تسجيل صوتي أو تتبّع حي في هذه المعاينة.',
                      textAlign: TextAlign.center,
                      textDirection: TextDirection.rtl,
                      style: TextStyle(
                        color: Color(0xFF76545A),
                        fontSize: 12,
                      ),
                    ),
                  ],
                );
              },
            );
          },
        ),
      ),
    );
  }
}

class _PrototypeNotice extends StatelessWidget {
  const _PrototypeNotice({required this.page});

  final int page;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFCF5),
        border: Border.all(color: const Color(0x1F800020)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        textDirection: TextDirection.rtl,
        children: [
          const Icon(Icons.science_outlined, color: Color(0xFF800020), size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'مرشح تقني • صفحة $page من ٦٠٤',
              textDirection: TextDirection.rtl,
              style: const TextStyle(
                color: Color(0xFF800020),
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          const Text(
            'QCF v2',
            style: TextStyle(
              color: Color(0xFF806315),
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

class _PageControls extends StatelessWidget {
  const _PageControls({
    required this.page,
    required this.onPrevious,
    required this.onNext,
  });

  final int page;
  final VoidCallback onPrevious;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Row(
      textDirection: TextDirection.rtl,
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        IconButton.filledTonal(
          tooltip: 'الصفحة التالية',
          onPressed: page < QcfPageRepository.totalPages ? onNext : null,
          icon: const Icon(Icons.chevron_right_rounded),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text(
            'صفحة $page من ${QcfPageRepository.totalPages}',
            textDirection: TextDirection.rtl,
            style: const TextStyle(
              color: Color(0xFF4C091B),
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        IconButton.filledTonal(
          tooltip: 'الصفحة السابقة',
          onPressed: page > 1 ? onPrevious : null,
          icon: const Icon(Icons.chevron_left_rounded),
        ),
      ],
    );
  }
}

class _MemorizationControls extends StatelessWidget {
  const _MemorizationControls({
    required this.hideWords,
    required this.onHideChanged,
    required this.onRevealNext,
    required this.onRevealAll,
  });

  final bool hideWords;
  final ValueChanged<bool> onHideChanged;
  final VoidCallback onRevealNext;
  final VoidCallback onRevealAll;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFF5EFE5),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        children: [
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text(
              'إخفاء الكلمات للحفظ',
              textDirection: TextDirection.rtl,
              style: TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: const Text(
              'تبقى مواضع الكلمات ثابتة',
              textDirection: TextDirection.rtl,
            ),
            value: hideWords,
            activeColor: const Color(0xFF800020),
            onChanged: onHideChanged,
          ),
          if (hideWords)
            Wrap(
              alignment: WrapAlignment.center,
              spacing: 8,
              children: [
                OutlinedButton.icon(
                  onPressed: onRevealNext,
                  icon: const Icon(Icons.visibility_outlined, size: 18),
                  label: const Text('كشف الكلمة التالية'),
                ),
                TextButton(
                  onPressed: onRevealAll,
                  child: const Text('إظهار الصفحة'),
                ),
              ],
            ),
        ],
      ),
    );
  }
}
