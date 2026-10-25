import AVFoundation
import ExpoModulesCore
import ReplayKit

private final class SessionCaptureEngine {
  private let queue = DispatchQueue(label: "app.replit.tabyan.session-recorder")
  private let screenRecorder = RPScreenRecorder.shared()
  private var writer: AVAssetWriter?
  private var videoInput: AVAssetWriterInput?
  private var appAudioInput: AVAssetWriterInput?
  private var microphoneInput: AVAssetWriterInput?
  private var outputURL: URL?
  private var firstPresentationTime: CMTime?
  private var lastPresentationTime: CMTime?
  private var isRecording = false
  private var isStopping = false
  private var stopCompletions: [((Result<[String: Any], Error>) -> Void)] = []
  private var lastResult: [String: Any]?

  func start() throws {
    if isRecording || isStopping {
      throw NSError(domain: "TabyanSessionRecorder", code: 1, userInfo: [NSLocalizedDescriptionKey: "التسجيل جارٍ بالفعل"])
    }
    lastResult = nil
    firstPresentationTime = nil
    lastPresentationTime = nil
    let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("tabyan-session-recordings", isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    outputURL = directory.appendingPathComponent("session-\(UUID().uuidString).mp4")
    try? FileManager.default.removeItem(at: outputURL!)

    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.playAndRecord, mode: .videoRecording, options: [.defaultToSpeaker, .allowBluetooth])
    try audioSession.setActive(true)
    screenRecorder.isMicrophoneEnabled = true
    screenRecorder.startCapture(handler: { [weak self] sampleBuffer, sampleType, error in
      guard let self, error == nil else { return }
      self.queue.async {
        self.append(sampleBuffer: sampleBuffer, type: sampleType)
      }
    }, completionHandler: { [weak self] error in
      if let error {
        self?.queue.async {
          self?.failStop(error)
        }
      }
    })
    isRecording = true
  }

  func stop(completion: @escaping (Result<[String: Any], Error>) -> Void) {
    if let lastResult {
      completion(.success(lastResult))
      return
    }
    guard isRecording else {
      completion(.failure(NSError(domain: "TabyanSessionRecorder", code: 2, userInfo: [NSLocalizedDescriptionKey: "لا يوجد تسجيل جارٍ"])))
      return
    }
    if isStopping {
      stopCompletions.append(completion)
      return
    }
    isStopping = true
    stopCompletions = [completion]
    screenRecorder.stopCapture { [weak self] error in
      guard let self else { return }
      self.queue.async {
        if let error {
          self.failStop(error)
        } else {
          self.finishWriter()
        }
      }
    }
  }

  func cancel(completion: @escaping () -> Void) {
    guard isRecording || isStopping else {
      completion()
      return
    }
    screenRecorder.stopCapture { [weak self] _ in
      guard let self else { return }
      self.queue.async {
        self.writer?.cancelWriting()
        if let outputURL = self.outputURL {
          try? FileManager.default.removeItem(at: outputURL)
        }
        self.reset()
        completion()
      }
    }
  }

  func clearFiles(completion: @escaping (Error?) -> Void) {
    queue.async {
      let directory = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("tabyan-session-recordings", isDirectory: true)
      do {
        if FileManager.default.fileExists(atPath: directory.path) {
          let files = try FileManager.default.contentsOfDirectory(
            at: directory,
            includingPropertiesForKeys: nil,
          )
          for file in files {
            try FileManager.default.removeItem(at: file)
          }
        }
        self.outputURL = nil
        self.lastResult = nil
        completion(nil)
      } catch {
        completion(error)
      }
    }
  }

  func status() -> String {
    if isStopping { return "stopping" }
    if isRecording { return "recording" }
    return "idle"
  }

  private func append(sampleBuffer: CMSampleBuffer, type: RPSampleBufferType) {
    guard isRecording, !isStopping, CMSampleBufferIsValid(sampleBuffer) else { return }
    if writer == nil, type == .video {
      do {
        try configureWriter(from: sampleBuffer)
      } catch {
        failStop(error)
        return
      }
    }
    guard let writer, writer.status == .writing || writer.status == .unknown else { return }
    let pts = CMSampleBufferGetPresentationTimeStamp(sampleBuffer)
    if firstPresentationTime == nil {
      firstPresentationTime = pts
      writer.startWriting()
      writer.startSession(atSourceTime: pts)
    }
    lastPresentationTime = pts
    switch type {
    case .video:
      if videoInput?.isReadyForMoreMediaData == true { _ = videoInput?.append(sampleBuffer) }
    case .audioApp:
      if appAudioInput?.isReadyForMoreMediaData == true { _ = appAudioInput?.append(sampleBuffer) }
    case .audioMic:
      if microphoneInput?.isReadyForMoreMediaData == true { _ = microphoneInput?.append(sampleBuffer) }
    @unknown default:
      break
    }
  }

  private func configureWriter(from sampleBuffer: CMSampleBuffer) throws {
    guard let outputURL else { throw NSError(domain: "TabyanSessionRecorder", code: 3, userInfo: [NSLocalizedDescriptionKey: "تعذر تجهيز ملف التسجيل"]) }
    let writer = try AVAssetWriter(outputURL: outputURL, fileType: .mp4)
    guard let format = CMSampleBufferGetFormatDescription(sampleBuffer),
          let dimensions = CMVideoFormatDescriptionGetDimensions(format) as CMVideoDimensions? else {
      throw NSError(domain: "TabyanSessionRecorder", code: 4, userInfo: [NSLocalizedDescriptionKey: "تعذر قراءة أبعاد فيديو الجلسة"])
    }
    let video = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: Int(dimensions.width),
      AVVideoHeightKey: Int(dimensions.height),
    ])
    video.expectsMediaDataInRealTime = true
    let audioSettings: [String: Any] = [
      AVFormatIDKey: kAudioFormatMPEG4AAC,
      AVNumberOfChannelsKey: 2,
      AVSampleRateKey: 44_100,
      AVEncoderBitRateKey: 128_000,
    ]
    let appAudio = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
    let microphone = AVAssetWriterInput(mediaType: .audio, outputSettings: audioSettings)
    appAudio.expectsMediaDataInRealTime = true
    microphone.expectsMediaDataInRealTime = true
    guard writer.canAdd(video), writer.canAdd(appAudio), writer.canAdd(microphone) else {
      throw NSError(domain: "TabyanSessionRecorder", code: 5, userInfo: [NSLocalizedDescriptionKey: "تعذر إنشاء مسارات صوت وفيديو التسجيل"])
    }
    writer.add(video)
    writer.add(appAudio)
    writer.add(microphone)
    self.writer = writer
    videoInput = video
    appAudioInput = appAudio
    microphoneInput = microphone
  }

  private func finishWriter() {
    guard let writer else {
      failStop(NSError(domain: "TabyanSessionRecorder", code: 6, userInfo: [NSLocalizedDescriptionKey: "لم يُنشأ ملف التسجيل"]))
      return
    }
    videoInput?.markAsFinished()
    appAudioInput?.markAsFinished()
    microphoneInput?.markAsFinished()
    writer.finishWriting { [weak self] in
      guard let self else { return }
      self.queue.async {
        guard writer.status == .completed, let outputURL = self.outputURL else {
          self.failStop(writer.error ?? NSError(domain: "TabyanSessionRecorder", code: 7, userInfo: [NSLocalizedDescriptionKey: "فشل إغلاق ملف التسجيل"]))
          return
        }
        let attributes = try? FileManager.default.attributesOfItem(atPath: outputURL.path)
        let size = (attributes?[.size] as? NSNumber)?.intValue ?? 0
        guard size > 0, let first = self.firstPresentationTime, let last = self.lastPresentationTime else {
          self.failStop(NSError(domain: "TabyanSessionRecorder", code: 8, userInfo: [NSLocalizedDescriptionKey: "ملف التسجيل فارغ"]))
          return
        }
        let duration = max(1, Int(CMTimeGetSeconds(CMTimeSubtract(last, first)).rounded()))
        let result: [String: Any] = [
          "uri": outputURL.absoluteString,
          "durationSeconds": duration,
          "fileSizeBytes": size,
          "mimeType": "video/mp4",
        ]
        self.lastResult = result
        self.reset(keepResult: true)
        let completions = self.stopCompletions
        self.stopCompletions = []
        completions.forEach { $0(.success(result)) }
      }
    }
  }

  private func failStop(_ error: Error) {
    writer?.cancelWriting()
    reset()
    let completions = stopCompletions
    stopCompletions = []
    completions.forEach { $0(.failure(error)) }
  }

  private func reset(keepResult: Bool = false) {
    isRecording = false
    isStopping = false
    writer = nil
    videoInput = nil
    appAudioInput = nil
    microphoneInput = nil
    firstPresentationTime = nil
    lastPresentationTime = nil
    if !keepResult { lastResult = nil }
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }
}

public final class TabyanSessionRecorderModule: Module {
  private let engine = SessionCaptureEngine()

  public func definition() -> ModuleDefinition {
    Name("TabyanSessionRecorder")

    // Placement camera recording is separate from ReplayKit session capture.
    // Check current authorization and establish a recording-capable session.
    AsyncFunction("preparePlacementRecording") {
      guard AVCaptureDevice.authorizationStatus(for: .video) == .authorized else {
        throw NSError(domain: "E_PLACEMENT_CAMERA_PERMISSION", code: 1,
          userInfo: [NSLocalizedDescriptionKey: "يلزم السماح باستخدام الكاميرا."])
      }
      guard AVCaptureDevice.authorizationStatus(for: .audio) == .authorized else {
        throw NSError(domain: "E_PLACEMENT_MIC_PERMISSION", code: 2,
          userInfo: [NSLocalizedDescriptionKey: "لم يتم السماح باستخدام الميكروفون."])
      }
      let session = AVAudioSession.sharedInstance()
      do {
        try session.setCategory(.playAndRecord, mode: .videoRecording, options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true)
      } catch {
        throw NSError(domain: "E_PLACEMENT_AUDIO_SESSION", code: 3,
          userInfo: [NSLocalizedDescriptionKey: "تعذر بدء تسجيل الصوت."])
      }
    }

    AsyncFunction("inspectPlacementVideo") { (uri: String, promise: Promise) in
      Task {
        do {
          guard let url = URL(string: uri), url.isFileURL else {
            throw NSError(domain: "PlacementMedia", code: 1, userInfo: [NSLocalizedDescriptionKey: "يلزم ملف تسجيل محلي."])
          }
          let size = (try FileManager.default.attributesOfItem(atPath: url.path)[.size] as? NSNumber)?.intValue ?? 0
          let handle = try FileHandle(forReadingFrom: url)
          defer { try? handle.close() }
          let header = try handle.read(upToCount: 64) ?? Data()
          // AVCaptureMovieFileOutput currently writes QuickTime (.mov). Check
          // the bytes instead of claiming a rename to .mp4 is a conversion.
          guard header.count >= 12,
                String(data: header.subdata(in: 4..<8), encoding: .ascii) == "ftyp" else {
            throw NSError(domain: "PlacementMedia", code: 2, userInfo: [NSLocalizedDescriptionKey: "تعذر التحقق من صيغة التسجيل."])
          }
          let brand = String(data: header.subdata(in: 8..<12), encoding: .ascii) ?? ""
          let mime: String
          if brand == "qt  " {
            mime = "video/quicktime"
          } else if ["isom", "iso2", "mp41", "mp42", "avc1"].contains(brand) {
            mime = "video/mp4"
          } else {
            throw NSError(domain: "PlacementMedia", code: 3, userInfo: [NSLocalizedDescriptionKey: "صيغة التسجيل غير مدعومة."])
          }
          let asset = AVURLAsset(url: url)
          let video = try await asset.loadTracks(withMediaType: .video)
          let audio = try await asset.loadTracks(withMediaType: .audio)
          let duration = CMTimeGetSeconds(try await asset.load(.duration))
          var videoCodecs: [String] = []
          var audioCodecs: [String] = []
          for track in video + audio {
            for format in try await track.load(.formatDescriptions) {
              let code = CMFormatDescriptionGetMediaSubType(format)
              let bytes: [UInt8] = [UInt8((code >> 24) & 255), UInt8((code >> 16) & 255), UInt8((code >> 8) & 255), UInt8(code & 255)]
              let codec = String(bytes: bytes, encoding: .ascii) ?? "unknown"
              if track.mediaType == .audio { audioCodecs.append(codec) }
              else { videoCodecs.append(codec) }
            }
          }
          promise.resolve([
            "uri": uri, "videoTrackCount": video.count, "audioTrackCount": audio.count,
            "durationSeconds": duration.isFinite ? duration : 0, "fileSizeBytes": size,
            "mimeType": mime, "videoCodecs": videoCodecs, "audioCodecs": audioCodecs
          ])
        } catch {
          promise.reject("E_PLACEMENT_MEDIA_INSPECTION", error.localizedDescription)
        }
      }
    }

    AsyncFunction("startSessionRecording") { (promise: Promise) in
      do {
        try self.engine.start()
        promise.resolve(nil)
      } catch {
        promise.reject("E_RECORDING_START", error.localizedDescription)
      }
    }

    AsyncFunction("stopSessionRecording") { (promise: Promise) in
      self.engine.stop { result in
        switch result {
        case .success(let value):
          promise.resolve(value)
        case .failure(let error):
          promise.reject("E_RECORDING_STOP", error.localizedDescription)
        }
      }
    }

    AsyncFunction("cancelSessionRecording") { (promise: Promise) in
      self.engine.cancel {
        promise.resolve(nil)
      }
    }

    AsyncFunction("clearSessionRecordings") { (promise: Promise) in
      self.engine.clearFiles { error in
        if let error {
          promise.reject("E_RECORDING_CLEANUP", error.localizedDescription)
        } else {
          promise.resolve(nil)
        }
      }
    }

    Function("getStatus") {
      self.engine.status()
    }
  }
}