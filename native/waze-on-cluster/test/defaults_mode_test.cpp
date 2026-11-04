// SPDX-License-Identifier: GPL-3.0-or-later
#include "defaults_mode.h"
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <string>
int main() {
    char dir[]="/tmp/woc-defaults-XXXXXX";
    assert(mkdtemp(dir));
    const std::string marker=std::string(dir)+"/bmw-defaults";
    assert(!bmw_defaults_active(marker.c_str()));
    FILE* f=fopen(marker.c_str(),"w");assert(f);fputs("off\n",f);fclose(f);
    assert(bmw_defaults_active(marker.c_str()));
    assert(bmw_defaults_active((marker+"/invalid").c_str())); // ENOTDIR fails closed
    assert(unlink(marker.c_str())==0);assert(!bmw_defaults_active(marker.c_str()));
    assert(rmdir(dir)==0);
    puts("ok persistent defaults marker, explicit resume, invalid path fails closed");
}
