{
  "targets": [
    {
      "target_name": "desktop_overlay",
      "sources": ["src/native/desktop_overlay.cpp"],
      "include_dirs": ["<!@(node -p \"require('node-addon-api').include\")"],
      "defines": [
        "NAPI_VERSION=8",
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "UNICODE",
        "_UNICODE",
        "_WIN32_WINNT=0x0A00"
      ],
      "msvs_settings": {
        "VCCLCompilerTool": {
          "ExceptionHandling": 1
        }
      },
      "conditions": [
        ["OS=='win'", {
          "libraries": [
            "user32.lib",
            "shell32.lib",
            "gdiplus.lib",
            "gdi32.lib",
            "ole32.lib",
            "comctl32.lib"
          ]
        }]
      ]
    }
  ]
}
