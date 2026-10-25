import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

import 'qcf_page_data.dart';

class QcfPageRepository {
  QcfPageRepository({Uri? baseUri, http.Client? client})
      : _baseUri = baseUri ?? _defaultBaseUri(),
        _client = client;

  static const fixturePages = {1, 2, 187, 604};
  static const totalPages = 604;
  static const _configuredBaseUrl =
      String.fromEnvironment('TABYAN_QCF_ASSET_BASE_URL');

  final Uri? _baseUri;
  http.Client? _client;
  final Map<int, Future<QcfPageData>> _pageRequests = {};
  final Map<int, Future<void>> _fontRequests = {};
  final Set<int> _loadedFonts = {};

  http.Client get _httpClient => _client ??= http.Client();

  static Uri? _defaultBaseUri() {
    if (_configuredBaseUrl.isNotEmpty) {
      return _normalizeBaseUri(Uri.parse(_configuredBaseUrl));
    }
    if (kIsWeb) return Uri.base.resolve('/mushaf/');
    return null;
  }

  static Uri _normalizeBaseUri(Uri uri) {
    if (!uri.hasScheme || !uri.hasAuthority) {
      throw ArgumentError.value(
        uri,
        'TABYAN_QCF_ASSET_BASE_URL',
        'Must be an absolute URL, such as https://example.com/mushaf/',
      );
    }
    final path = uri.path.endsWith('/') ? uri.path : '${uri.path}/';
    return uri.replace(path: path);
  }

  Future<QcfPageData> loadPage(int page) {
    if (page < 1 || page > totalPages) {
      return Future.error(RangeError.range(page, 1, totalPages, 'page'));
    }

    final existing = _pageRequests[page];
    if (existing != null) return existing;

    final request = _loadPageUncached(page).catchError(
      (Object error, StackTrace stackTrace) {
        _pageRequests.remove(page);
        Error.throwWithStackTrace(error, stackTrace);
      },
    );
    _pageRequests[page] = request;
    return request;
  }

  Future<QcfPageData> _loadPageUncached(int page) async {
    if (fixturePages.contains(page)) {
      final source =
          await rootBundle.loadString('assets/qcf_v2/pages/$page.json');
      return QcfPageData.fromJson(jsonDecode(source) as Map<String, dynamic>);
    }

    final baseUri = _baseUri;
    if (baseUri == null) {
      throw StateError(
        'Page $page is not bundled in the prototype. Configure '
        'TABYAN_QCF_ASSET_BASE_URL to load the remaining QCF v2 pages.',
      );
    }

    final responseFuture = _httpClient.get(baseUri.resolve('pages/$page.json'));
    final fontFuture = _ensurePageFont(page, baseUri);
    final response = await responseFuture;
    if (response.statusCode != 200) {
      throw StateError(
        'Could not load QCF v2 page $page (HTTP ${response.statusCode}).',
      );
    }
    await fontFuture;
    return QcfPageData.fromJson(
      jsonDecode(utf8.decode(response.bodyBytes)) as Map<String, dynamic>,
    );
  }

  Future<void> _ensurePageFont(int page, Uri baseUri) {
    if (_loadedFonts.contains(page)) return Future.value();
    final existing = _fontRequests[page];
    if (existing != null) return existing;

    final request = _loadPageFont(page, baseUri).catchError(
      (Object error, StackTrace stackTrace) {
        _fontRequests.remove(page);
        Error.throwWithStackTrace(error, stackTrace);
      },
    );
    _fontRequests[page] = request;
    return request;
  }

  Future<void> _loadPageFont(int page, Uri baseUri) async {
    final response =
        await _httpClient.get(baseUri.resolve('fonts-ttf/p$page.ttf'));
    if (response.statusCode != 200) {
      throw StateError(
        'Could not load QCF v2 font for page $page '
        '(HTTP ${response.statusCode}).',
      );
    }
    final bytes = Uint8List.fromList(response.bodyBytes);
    final fontData = ByteData.sublistView(bytes);
    final loader = FontLoader('QcfPage$page')
      ..addFont(Future<ByteData>.value(fontData));
    await loader.load();
    _loadedFonts.add(page);
    _fontRequests.remove(page);
  }
}
