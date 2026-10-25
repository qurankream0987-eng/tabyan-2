Pod::Spec.new do |s|
  s.name = 'TabyanSessionRecorder'
  s.version = '0.0.0'
  s.summary = 'Tabyan native session capture and local placement media inspection.'
  s.description = 'App-local Expo module for session capture and AVFoundation inspection of placement camera files.'
  s.license = { :type => 'Proprietary' }
  s.author = 'Tabyan'
  s.homepage = 'https://expo.dev'
  s.platforms = { :ios => '15.1' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'AVFoundation', 'ReplayKit'
  s.source_files = '**/*.{h,m,mm,swift}'
  s.swift_version = '5.9'
end
