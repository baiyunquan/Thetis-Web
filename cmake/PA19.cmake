# cmake/PA19.cmake - PortAudio 19 with FlexRadio / Thetis wrapper (PA19.dll)

set(PA19_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/Project Files/lib/portaudio-19.7.0")

set(PA19_SOURCES
    "${PA19_ROOT}/src/common/pa_allocation.c"
    "${PA19_ROOT}/src/common/pa_converters.c"
    "${PA19_ROOT}/src/common/pa_cpuload.c"
    "${PA19_ROOT}/src/common/pa_debugprint.c"
    "${PA19_ROOT}/src/common/pa_dither.c"
    "${PA19_ROOT}/src/common/pa_front.c"
    "${PA19_ROOT}/src/common/pa_process.c"
    "${PA19_ROOT}/src/common/pa_ringbuffer.c"
    "${PA19_ROOT}/src/common/pa_stream.c"
    "${PA19_ROOT}/src/common/pa_trace.c"
    "${PA19_ROOT}/src/hostapi/asio/ASIOSDK/common/asio.cpp"
    "${PA19_ROOT}/src/hostapi/asio/ASIOSDK/host/asiodrivers.cpp"
    "${PA19_ROOT}/src/hostapi/asio/ASIOSDK/host/pc/asiolist.cpp"
    "${PA19_ROOT}/src/hostapi/asio/pa_asio.cpp"
    "${PA19_ROOT}/src/hostapi/dsound/pa_win_ds.c"
    "${PA19_ROOT}/src/hostapi/dsound/pa_win_ds_dynlink.c"
    "${PA19_ROOT}/src/hostapi/skeleton/pa_hostapi_skeleton.c"
    "${PA19_ROOT}/src/hostapi/wasapi/pa_win_wasapi.c"
    "${PA19_ROOT}/src/hostapi/wdmks/pa_win_wdmks.c"
    "${PA19_ROOT}/src/hostapi/wmme/pa_win_wmme.c"
    "${PA19_ROOT}/src/os/win/pa_win_coinitialize.c"
    "${PA19_ROOT}/src/os/win/pa_win_hostapis.c"
    "${PA19_ROOT}/src/os/win/pa_win_util.c"
    "${PA19_ROOT}/src/os/win/pa_win_version.c"
    "${PA19_ROOT}/src/os/win/pa_win_waveformat.c"
    "${PA19_ROOT}/src/os/win/pa_win_wdmks_utils.c"
    "${PA19_ROOT}/src/os/win/pa_x86_plain_converters.c"
    "${PA19_ROOT}/build/msvc/PA19.cpp"
    "${PA19_ROOT}/build/msvc/portaudio.def"
)

add_library(PA19 SHARED ${PA19_SOURCES})

target_include_directories(PA19
    PUBLIC
        "${PA19_ROOT}/include"
    PRIVATE
        "${PA19_ROOT}/src/common"
        "${PA19_ROOT}/build/msvc"
        "${PA19_ROOT}/src/os/win"
        "${PA19_ROOT}/src/hostapi/asio/ASIOSDK/common"
        "${PA19_ROOT}/src/hostapi/asio/ASIOSDK/host"
        "${PA19_ROOT}/src/hostapi/asio/ASIOSDK/host/pc"
)

target_compile_definitions(PA19
    PRIVATE
        WIN32
        _WINDOWS
        _USRDLL
        _CRT_SECURE_NO_DEPRECATE
        PAWIN_USE_WDMKS_DEVICE_INFO
        PA_USE_ASIO=1
        PA_USE_DS=1
        PA_USE_WMME=1
        PA_USE_WASAPI=1
        PA_USE_WDMKS=1
        $<$<CONFIG:Debug>:_DEBUG;PA_ENABLE_DEBUG_OUTPUT>
        $<$<CONFIG:Release>:NDEBUG>
)

if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    target_compile_definitions(PA19 PRIVATE _WIN64)
endif()

target_link_libraries(PA19
    PRIVATE
        ksuser
        winmm
        ole32
        uuid
        advapi32
        setupapi
)

set_target_properties(PA19 PROPERTIES
    OUTPUT_NAME "PA19"
    PREFIX ""
)

