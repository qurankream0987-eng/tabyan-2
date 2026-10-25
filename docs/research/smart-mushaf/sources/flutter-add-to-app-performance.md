Source: https://docs.flutter.dev/add-to-app/performance
Title: Load sequence, performance, and memory
Fetched: 2026-10-15T02:09:34.635Z

[Skip to main content](https://docs.flutter.dev/add-to-app/performance#site-content-title)

- [asteriskGuides](https://docs.flutter.dev/)
- [play\_lessonLearn](https://docs.flutter.dev/learn/pathway)
- [auto\_awesomeAI](https://docs.flutter.dev/ai/get-started)
- [apiReference](https://api.flutter.dev/)

Flutter 3.47 is here! Read the [blog post](https://flutter.dev/blog/whats-new-in-flutter-3-47).


This page describes the breakdown of the steps involved
to show a Flutter UI. Knowing this, you can make better,
more informed decisions about when to pre-warm the Flutter engine,
which operations are possible at which stage,
and the latency and memory costs of those operations.


## Loading Flutter

[#](https://docs.flutter.dev/add-to-app/performance#loading-flutter)

Android and iOS apps (the two supported platforms for
integrating into existing apps), full Flutter apps,
and add-to-app patterns have a similar sequence of
conceptual loading steps when displaying the Flutter UI.


### Finding the Flutter resources

[#](https://docs.flutter.dev/add-to-app/performance#finding-the-flutter-resources)

Flutter's engine runtime and your application's compiled
Dart code are both bundled as shared libraries on Android
and iOS. The first step of loading Flutter is to find those
resources in your .apk/.ipa/.app (along with other Flutter
assets such as images, fonts, and JIT code, if applicable).


This happens when you construct a `FlutterEngine` for the
first time on both **[Android](https://api.flutter.dev/javadoc/io/flutter/embedding/engine/FlutterEngine.html)**

and **[iOS](https://api.flutter.dev/ios-embedder/interface_flutter_engine.html)**
APIs.


### Loading the Flutter library

[#](https://docs.flutter.dev/add-to-app/performance#loading-the-flutter-library)

After it's found, the engine's shared libraries are memory loaded
once per process.


On **Android**, this also happens when the
[`FlutterEngine`](https://api.flutter.dev/javadoc/io/flutter/embedding/engine/FlutterEngine.html)
is constructed because the
JNI connectors need to reference the Flutter C++ library.
On **iOS**, this happens when the
[`FlutterEngine`](https://api.flutter.dev/ios-embedder/interface_flutter_engine.html)
is first run,
such as by running [`runWithEntrypoint:`](https://api.flutter.dev/ios-embedder/interface_flutter_engine.html#a019d6b3037eff6cfd584fb2eb8e9035e).


### Starting the Dart VM

[#](https://docs.flutter.dev/add-to-app/performance#starting-the-dart-vm)

The Dart runtime is responsible for managing Dart memory and
concurrency for your Dart code. In JIT mode,
it's additionally responsible for compiling
the Dart source code into machine code during runtime.


A single Dart runtime exists per application session on
Android and iOS.


A one-time Dart VM start is done when constructing the
[`FlutterEngine`](https://api.flutter.dev/javadoc/io/flutter/embedding/engine/FlutterEngine.html)
for the first time on
**Android** and when [running a Dart entrypoint](https://api.flutter.dev/ios-embedder/interface_flutter_engine.html)

for the first time on **iOS**.


At this point, your Dart code's [snapshot](https://github.com/dart-lang/sdk/wiki/Snapshots)

is also loaded into memory from your application's files.


This is a generic process that also occurs if you used the
[Dart SDK](https://dart.dev/tools/sdk) directly, without the Flutter engine.


The Dart VM never shuts down after it's started.

### Creating and running a Dart Isolate

[#](https://docs.flutter.dev/add-to-app/performance#creating-and-running-a-dart-isolate)

After the Dart runtime is initialized,
the Flutter engine's usage of the Dart
runtime is the next step.


This is done by starting a [Dart `Isolate`](https://api.dart.dev/dart-isolate/Isolate-class.html)
in the Dart runtime.
The isolate is Dart's container for memory and threads.
A number of [auxiliary threads](https://github.com/flutter/flutter/blob/main/docs/about/The-Engine-architecture.md#threading)
on the host platform are
also created at this point to support the isolate, such
as a thread for offloading GPU handling and another for image decoding.


One isolate exists per `FlutterEngine` instance, and multiple isolates
can be hosted by the same Dart VM.


On **Android**, this happens when you call
[`DartExecutor.executeDartEntrypoint()`](https://api.flutter.dev/javadoc/io/flutter/embedding/engine/dart/DartExecutor.html#executeDartEntrypoint-io.flutter.embedding.engine.dart.DartExecutor.DartEntrypoint-)

on a `FlutterEngine` instance.


On **iOS**, this happens when you call [`runWithEntrypoint:`](https://api.flutter.dev/ios-embedder/interface_flutter_engine.html#a019d6b3037eff6cfd584fb2eb8e9035e)

on a `FlutterEngine`.


At this point, your Dart code's selected entrypoint
(the `main()` function of your Dart library's `main.dart` file,
by default) is executed. If you called the
Flutter function [`runApp()`](https://api.flutter.dev/flutter/widgets/runApp.html)
in your `main()` function,
then your Flutter app or your library's widget tree is also created
and built. If you need to prevent certain functionalities from executing
in your Flutter code, then the `AppLifecycleState.detached`
enum value indicates that the `FlutterEngine` isn't attached
to any UI components such as a `FlutterViewController`
on iOS or a `FlutterActivity` on Android.


### Attaching a UI to the Flutter engine

[#](https://docs.flutter.dev/add-to-app/performance#attaching-a-ui-to-the-flutter-engine)

A standard, full Flutter app moves to reach this state as
soon as the app is launched.


In an add-to-app scenario,
this happens when you attach a `FlutterEngine`
to a UI component such as by calling [`startActivity()`](https://developer.android.com/reference/android/content/Context#startActivity(android.content.Intent))

with an [`Intent`](https://developer.android.com/reference/android/content/Intent.html)
built using [`FlutterActivity.withCachedEngine()`](https://api.flutter.dev/javadoc/io/flutter/embedding/android/FlutterActivity.html#withCachedEngine-java.lang.String-)

on **Android**. Or, by presenting a [`FlutterViewController`](https://api.flutter.dev/ios-embedder/interface_flutter_view_controller.html)

initialized by using [`initWithEngine: nibName: bundle:`](https://api.flutter.dev/ios-embedder/interface_flutter_view_controller.html#a0aeea9525c569d5efbd359e2d95a7b31)

on **iOS**.


This is also the case if a Flutter UI component was launched without
pre-warming a `FlutterEngine` such as with
[`FlutterActivity.createDefaultIntent()`](https://api.flutter.dev/javadoc/io/flutter/embedding/android/FlutterActivity.html#createDefaultIntent-android.content.Context-)
on **Android**,
or with [`FlutterViewController initWithProject: nibName: bundle:`](https://api.flutter.dev/ios-embedder/interface_flutter_view_controller.html#aa3aabfb89e958602ce6a6690c919f655)

on **iOS**. An implicit `FlutterEngine` is created in these cases.


Behind the scene, both platform's UI components provide the
`FlutterEngine` with a rendering surface such as a
[`Surface`](https://developer.android.com/reference/android/view/Surface)
on **Android** or a [CAEAGLLayer](https://developer.apple.com/documentation/quartzcore/caeagllayer)
or [CAMetalLayer](https://developer.apple.com/documentation/quartzcore/cametallayer)
on **iOS**.


At this point, the [`Layer`](https://api.flutter.dev/flutter/rendering/Layer-class.html)
tree generated by your Flutter
program, per frame, is converted into
OpenGL (or Vulkan or Metal) GPU instructions.


Was this page's content helpful?

thumb\_upthumb\_down

Unless stated otherwise, the documentation on this site reflects Flutter 3.47. Page last updated on 2026-07-31. [View source](https://github.com/flutter/website/blob/main/sites/docs/src/content/add-to-app/performance.md) or [report an issue](https://github.com/flutter/website/issues/new?template=1_page_issue.yml&page-url=https://docs.flutter.dev/add-to-app/performance&page-source=https://github.com/flutter/website/blob/main/sites/docs/src/content/add-to-app/performance.md "Report an issue with this page").