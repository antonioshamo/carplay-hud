// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
// Source identities are stable save keys. Colour variants are settings, not
// hundreds of duplicate themes. Previews come from the actual imported scene.
const THEMES=[
 ['map_focus','CarPlay Map','Cluster Layouts + CarPlay','ui'],
 ['m','M','Bimmer-lab / Cluster Layouts','orb'],
 ['sport','Sport','Bimmer-lab / Cluster Layouts','wide'],
 ['gt3','GT3','Bimmer-lab / Cluster Layouts','bold'],
 ['classic','Classic M','Cluster Layouts','bold'],
 ['analog_sport','Analog sport','Cluster Layouts','bold'],
 ['digital_round','Digital round','Cluster Layouts','bold'],
 ['modern_wide','Modern wide','Cluster Layouts','bold'],
 ['digital_dash','Digital dash','Cluster Layouts','bold'],
 ['retro','Retro','Cluster Layouts','bold'],
 ['track','Track','Cluster Layouts','bold'],
 ['pulse','Pulse','Cluster Layouts','bold'],
 ['freedom','Freedom','Cluster Layouts','bold']
].map(a=>({id:a[0],name:a[1],source:a[2],font:a[3],verification:'X4 M vehicle test pending'}));
const PALETTES=['comfort','sport','efficient'];
module.exports={THEMES,PALETTES};
