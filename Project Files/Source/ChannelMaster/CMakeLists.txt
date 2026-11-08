# Project Files/Source/ChannelMaster/CMakeLists.txt

file(GLOB CHANNELMASTER_SOURCES CONFIGURE_DEPENDS
    "${CMAKE_CURRENT_SOURCE_DIR}/*.c"
)

list(APPEND CHANNELMASTER_SOURCES "${CMAKE_CURRENT_SOURCE_DIR}/ChannelMaster.rc")

add_library(ChannelMaster SHARED ${CHANNELMASTER_SOURCES})

target_include_directories(ChannelMaster
    PUBLIC
        "${CMAKE_CURRENT_SOURCE_DIR}"
    PRIVATE
        "${CMAKE_CURRENT_SOURCE_DIR}/../wdsp"
        "${CMAKE_CURRENT_SOURCE_DIR}/../../lib/portaudio-19.7.0/include"
        "${CMAKE_CURRENT_SOURCE_DIR}/../../lib/NR_Algorithms_${THETIS_PLATFORM}"
)

target_compile_definitions(ChannelMaster
    PRIVATE
        WIN32
        _WINDOWS
        _USRDLL
        CHANNELMASTER_EXPORTS
        _CRT_SECURE_NO_WARNINGS
        _CRT_NONSTDC_NO_DEPRECATE
        $<$<CONFIG:Debug>:_DEBUG>
        $<$<CONFIG:Release>:NDEBUG>
)

if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    target_compile_definitions(ChannelMaster PRIVATE _WIN64)
endif()

if(MSVC)
    target_compile_options(ChannelMaster PRIVATE /TC /FS)
endif()

target_link_libraries(ChannelMaster
    PRIVATE
        wdsp
        PA19
        cmASIO
        avrt
        ws2_32
)

set_target_properties(ChannelMaster PROPERTIES
    OUTPUT_NAME "ChannelMaster"
    PREFIX ""
)

