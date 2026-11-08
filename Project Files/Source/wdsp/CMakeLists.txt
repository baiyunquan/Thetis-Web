# Project Files/Source/wdsp/CMakeLists.txt

file(GLOB WDSP_SOURCES CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/*.c"
)

list(APPEND WDSP_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/wdsp.rc")

add_library(wdsp SHARED ${WDSP_SOURCES})

target_include_directories(wdsp
    PUBLIC
        "${CMAKE_CURRENT_SOURCE_DIR}"
    PRIVATE
        "${CMAKE_CURRENT_SOURCE_DIR}/../../lib/portaudio-19.7.0/include"
        "${CMAKE_CURRENT_SOURCE_DIR}/../../lib/NR_Algorithms_${THETIS_PLATFORM}"
        "${CMAKE_CURRENT_SOURCE_DIR}/../../lib/fftw_${THETIS_PLATFORM}"
)

target_compile_definitions(wdsp
    PRIVATE
        WIN32
        _WINDOWS
        _USRDLL
        WDSP_EXPORTS
        SPECHPSDR_EXPORTS
        _CRT_SECURE_NO_WARNINGS
        _CRT_NONSTDC_NO_DEPRECATE
        $<$<CONFIG:Debug>:_DEBUG>
        $<$<CONFIG:Release>:NDEBUG>
)

if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    target_compile_definitions(wdsp PRIVATE _WIN64)
endif()

# Additional MSVC compile options
if(MSVC)
    target_compile_options(wdsp PRIVATE /TC)
endif()

target_link_libraries(wdsp
    PRIVATE
        avrt
        "${CMAKE_CURRENT_SOURCE_DIR}/../../lib/fftw_${THETIS_PLATFORM}/libfftw3-3.lib"
        "${CMAKE_CURRENT_SOURCE_DIR}/../../lib/NR_Algorithms_${THETIS_PLATFORM}/rnnoise.lib"
        "${CMAKE_CURRENT_SOURCE_DIR}/../../lib/NR_Algorithms_${THETIS_PLATFORM}/specbleach.lib"
)

set_target_properties(wdsp PROPERTIES
    OUTPUT_NAME "wdsp"
    PREFIX ""
)

