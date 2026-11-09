cmake_minimum_required(VERSION 3.20)
project(Thetis LANGUAGES C CXX)

set(CMAKE_C_STANDARD 11)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Default to x64 if MSVC
if(MSVC)
    add_compile_options(/W3 /MP)
endif()

# Architecture detection (default: x64)
if(CMAKE_SIZEOF_VOID_P EQUAL 8)
    set(THETIS_PLATFORM "x64")
else()
    set(THETIS_PLATFORM "x86")
endif()

message(STATUS "Thetis build target platform: ${THETIS_PLATFORM}")

# Global output directories
set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")

# 1. Native C/C++ DSP & Audio Targets
include(cmake/PA19.cmake)
add_subdirectory("Project Files/Source/wdsp")
add_subdirectory("Project Files/Source/cmASIO")
add_subdirectory("Project Files/Source/ChannelMaster")

add_custom_target(native_core ALL
    DEPENDS PA19 wdsp cmASIO ChannelMaster
)

# 2. Runtime dependencies: third-party DLLs and data assets
set(THETIS_DEPS_DIR "${CMAKE_CURRENT_SOURCE_DIR}/Project Files/lib")
set(THETIS_RUNTIME_FILES
    "${THETIS_DEPS_DIR}/fftw_${THETIS_PLATFORM}/libfftw3-3.dll"
    "${THETIS_DEPS_DIR}/NR_Algorithms_x64/rnnoise.dll"
    "${THETIS_DEPS_DIR}/NR_Algorithms_x64/specbleach.dll"
    "${THETIS_DEPS_DIR}/NR_Algorithms_x64/rnnoise_weights_large.bin"
    "${THETIS_DEPS_DIR}/NR_Algorithms_x64/rnnoise_weights_small.bin"
    "${THETIS_DEPS_DIR}/SkiaSharp/libSkiaSharp.dll"
    "${THETIS_DEPS_DIR}/Thetis-resources/zetaHat.bin"
    "${THETIS_DEPS_DIR}/Thetis-resources/calculus"
)

if(EXISTS "${THETIS_DEPS_DIR}/NR_Algorithms_x64/rnnoise_avx2.dll")
    list(APPEND THETIS_RUNTIME_FILES "${THETIS_DEPS_DIR}/NR_Algorithms_x64/rnnoise_avx2.dll")
endif()

# Copy runtime dependencies directly alongside the generated DLLs
option(ENABLE_CODE_UI "Build and stage the Thetis Code OSS browser foundation" ON)

# Explicit, optional browser workbench build; normal radio builds only stage cached output.
add_custom_target(code_web
    COMMAND powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${CMAKE_CURRENT_SOURCE_DIR}/ui/build-code-web.ps1"
    WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
    COMMENT "Ensuring the pinned Code OSS browser bundle is current"
    VERBATIM
)

if(ENABLE_CODE_UI)
    add_custom_target(thetis_ui
        COMMAND powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${CMAKE_CURRENT_SOURCE_DIR}/ui/build-ui.ps1"
        WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
        COMMENT "Building the Thetis browser host, extension and public asset manifest"
        VERBATIM
    )
    add_dependencies(thetis_ui code_web)
endif()

add_custom_target(copy_runtime_dependencies ALL
    COMMAND ${CMAKE_COMMAND} -E copy_if_different ${THETIS_RUNTIME_FILES} "$<TARGET_FILE_DIR:ChannelMaster>"
    DEPENDS ChannelMaster
    COMMENT "Copying third-party runtime DLLs and weights to $<TARGET_FILE_DIR:ChannelMaster>"
)

# 3. Optional staging target to copy built binaries to 'Project Files/bin/<platform>/<Config>'
option(STAGE_TO_PROJECT_BIN "Stage built native DLLs to 'Project Files/bin/${THETIS_PLATFORM}/<Config>'" ON)

if(STAGE_TO_PROJECT_BIN)
    set(PROJECT_BIN_DIR "${CMAKE_CURRENT_SOURCE_DIR}/Project Files/bin/${THETIS_PLATFORM}")
    add_custom_target(stage_to_project_bin
        COMMAND ${CMAKE_COMMAND} -E make_directory "${PROJECT_BIN_DIR}/$<CONFIG>"
        COMMAND ${CMAKE_COMMAND} -E copy_if_different ${THETIS_RUNTIME_FILES} "${PROJECT_BIN_DIR}/$<CONFIG>"
        COMMAND ${CMAKE_COMMAND} -E copy_if_different "$<TARGET_FILE:PA19>" "${PROJECT_BIN_DIR}/$<CONFIG>"
        COMMAND ${CMAKE_COMMAND} -E copy_if_different "$<TARGET_FILE:wdsp>" "${PROJECT_BIN_DIR}/$<CONFIG>"
        COMMAND ${CMAKE_COMMAND} -E copy_if_different "$<TARGET_FILE:cmASIO>" "${PROJECT_BIN_DIR}/$<CONFIG>"
        COMMAND ${CMAKE_COMMAND} -E copy_if_different "$<TARGET_FILE:ChannelMaster>" "${PROJECT_BIN_DIR}/$<CONFIG>"
        DEPENDS ChannelMaster PA19 wdsp cmASIO
        COMMENT "Staging native DLLs and dependencies to ${PROJECT_BIN_DIR}/$<CONFIG>"
    )
    if(ENABLE_CODE_UI)
        add_dependencies(stage_to_project_bin thetis_ui)
        add_custom_command(TARGET stage_to_project_bin POST_BUILD
            COMMAND powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${CMAKE_CURRENT_SOURCE_DIR}/ui/stage-code-web.ps1" -Destination "$<TARGET_FILE_DIR:ChannelMaster>/web"
            COMMAND powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${CMAKE_CURRENT_SOURCE_DIR}/ui/stage-code-web.ps1" -Destination "${PROJECT_BIN_DIR}/$<CONFIG>/web"
            COMMENT "Replacing generated browser assets with the Thetis Code OSS foundation"
            VERBATIM
        )
    endif()
endif()

# 4. Optional C# Managed App Build via MSBuild / dotnet CLI
option(ENABLE_MANAGED_BUILD "Provide target to build C# Thetis.exe using MSBuild / dotnet CLI" ON)

option(USE_DOTNET "Use dotnet CLI to build C# components instead of MSBuild" ON)

if(ENABLE_MANAGED_BUILD)
    find_program(DOTNET_EXECUTABLE NAMES dotnet)
    find_program(MSBUILD_EXECUTABLE NAMES MSBuild.exe msbuild
        HINTS
            "C:/Program Files/Microsoft Visual Studio/18/Community/MSBuild/Current/Bin/amd64"
            "C:/Program Files/Microsoft Visual Studio/18/Community/MSBuild/Current/Bin"
            "C:/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin/amd64"
            "C:/Program Files/Microsoft Visual Studio/2022/Community/MSBuild/Current/Bin"
    )

    if(USE_DOTNET AND DOTNET_EXECUTABLE)
        message(STATUS "Using dotnet CLI for managed build: ${DOTNET_EXECUTABLE}")
        set(MANAGED_BUILDER "${DOTNET_EXECUTABLE}")
        set(MANAGED_BUILD_ARGS
            "build"
            "${CMAKE_CURRENT_SOURCE_DIR}/Project Files/Source/Console/Thetis.csproj"
            "-c" "$<CONFIG>"
            "-p:Platform=${THETIS_PLATFORM}"
        )
    elseif(MSBUILD_EXECUTABLE)
        message(STATUS "Using MSBuild for managed build: ${MSBUILD_EXECUTABLE}")
        set(MANAGED_BUILDER "${MSBUILD_EXECUTABLE}")
        set(MANAGED_BUILD_ARGS
            "${CMAKE_CURRENT_SOURCE_DIR}/Project Files/Source/Console/Thetis.csproj"
            "/p:Configuration=$<CONFIG>"
            "/p:Platform=${THETIS_PLATFORM}"
            "/m"
        )
    elseif(DOTNET_EXECUTABLE)
        message(STATUS "Found dotnet CLI: ${DOTNET_EXECUTABLE}")
        set(MANAGED_BUILDER "${DOTNET_EXECUTABLE}")
        set(MANAGED_BUILD_ARGS
            "build"
            "${CMAKE_CURRENT_SOURCE_DIR}/Project Files/Source/Console/Thetis.csproj"
            "-c" "$<CONFIG>"
            "-p:Platform=${THETIS_PLATFORM}"
        )
    endif()

    if(MANAGED_BUILDER)
        add_custom_target(ThetisApp
            COMMAND ${MANAGED_BUILDER} ${MANAGED_BUILD_ARGS}
            WORKING_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
            DEPENDS ChannelMaster PA19 wdsp cmASIO
            COMMENT "Building C# Thetis.exe and C# dependencies via ${MANAGED_BUILDER}..."
        )
        if(STAGE_TO_PROJECT_BIN)
            add_dependencies(ThetisApp stage_to_project_bin)
        endif()
    endif()
endif()
