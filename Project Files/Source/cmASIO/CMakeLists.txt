# Project Files/Source/cmASIO/CMakeLists.txt

set(CMASIO_SOURCES
    "${CMAKE_CURRENT_SOURCE_DIR}/asiosdk_2.3.3_2019-06-14/common/asio.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/asiosdk_2.3.3_2019-06-14/host/asiodrivers.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/asiosdk_2.3.3_2019-06-14/host/pc/asiolist.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/dllmain.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/hostsample.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/version.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/cmASIO.rc"
)

add_library(cmASIO SHARED ${CMASIO_SOURCES})

target_include_directories(cmASIO
    PUBLIC
        "${CMAKE_CURRENT_SOURCE_DIR}"
    PRIVATE
        "${CMAKE_CURRENT_SOURCE_DIR}/asiosdk_2.3.3_2019-06-14/common"
        "${CMAKE_CURRENT_SOURCE_DIR}/asiosdk_2.3.3_2019-06-14/host"
        "${CMAKE_CURRENT_SOURCE_DIR}/asiosdk_2.3.3_2019-06-14/host/pc"
        "${CMAKE_CURRENT_SOURCE_DIR}/../ChannelMaster"
)

target_compile_definitions(cmASIO
    PRIVATE
        WIN32
        _WINDOWS
        _USRDLL
        CMASIO_EXPORTS
        _CRT_SECURE_NO_WARNINGS
        $<$<CONFIG:Debug>:_DEBUG>
        $<$<CONFIG:Release>:NDEBUG>
)

if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    target_compile_definitions(cmASIO PRIVATE _WIN64)
endif()

if(MSVC)
    target_compile_options(cmASIO PRIVATE /TP)
endif()

target_link_libraries(cmASIO
    PRIVATE
        ole32
        user32
        advapi32
)

set_target_properties(cmASIO PROPERTIES
    OUTPUT_NAME "cmASIO"
    PREFIX ""
)

