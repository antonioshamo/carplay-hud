// SPDX-License-Identifier: GPL-3.0-or-later
#include "picture_gate.h"
#include <cassert>
#include <cstdio>
using woc::PictureGate;
int main()
{
    PictureGate p;
    assert(!p.update(true, false, true, true, 0));
    assert(!p.update(true, false, false, false, 5000));
    assert(p.update(true, false, true, false, 5001));
    // A static nonblank map needs no artificially repeated picture.
    assert(p.update(true, false, false, true, 20000));
    assert(p.update(true, false, true, true, 20001));
    assert(p.poll_ms(20101) == 150);
    assert(p.update(true, false, true, false, 20150));
    assert(p.bridged() == 1 && p.expired() == 0);
    for (int i=0; i<100; ++i) {
        assert(p.update(true, false, true, true, 21000+i*100));
        assert(p.update(true, false, true, false, 21050+i*100));
    }
    assert(p.bridged() == 101);
    assert(p.update(true, false, true, true, 40000));
    assert(p.update(true, false, true, true, 40249));
    assert(p.poll_ms(40250) == 0);
    assert(!p.update(true, false, false, false, 40250));
    assert(p.expired() == 1);
    assert(!p.update(true, false, true, true, 50000));
    assert(p.update(true, false, true, false, 50001));
    assert(!p.update(false, false, false, false, 50002));
    assert(!p.update(true, false, false, false, 50003));
    assert(p.update(true, false, true, false, 50004));
    assert(!p.update(true, true, true, false, 50005));
    assert(!p.update(true, false, false, false, 50006));
    assert(p.update(true, false, true, false, 50007));
    assert(!p.update(true, false, true, false, 10));
    assert(!p.update(true, false, false, false, 11));
    assert(p.update(true, false, true, false, 12));
    assert(!p.update(true, false, true, false, -1));
    std::puts("picture gate: transient blanks, sustained blanks, disconnect, freeze and clock reset passed");
}
