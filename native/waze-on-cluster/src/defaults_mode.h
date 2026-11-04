// SPDX-License-Identifier: GPL-3.0-or-later
#pragma once
#include <cerrno>
#include <unistd.h>
// Only a confirmed missing marker permits output. Permission and I/O errors
// suppress custom drawings until the owner can inspect the saved state.
inline bool bmw_defaults_active(const char* path) {
    return access(path, F_OK) == 0 || errno != ENOENT;
}
