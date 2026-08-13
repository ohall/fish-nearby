insert into public.source (
  id,
  name,
  agency,
  upstream_url,
  source_kind,
  jurisdiction,
  refresh_cadence,
  attribution,
  license_notes
)
values (
  '00000000-0000-4000-8000-000000000001',
  'Great Fishing Close to Home',
  'New Jersey Department of Environmental Protection',
  'https://services1.arcgis.com/QWdNfRs7lkPq4g4Q/arcgis/rest/services/Great_Fishing_Close_to_Home/FeatureServer',
  'arcgis',
  'NJ',
  'monthly',
  'New Jersey Department of Environmental Protection',
  'Verify NJDEP attribution and reuse terms before public launch.'
)
on conflict (id) do update set
  name = excluded.name,
  agency = excluded.agency,
  upstream_url = excluded.upstream_url,
  source_kind = excluded.source_kind,
  jurisdiction = excluded.jurisdiction,
  refresh_cadence = excluded.refresh_cadence,
  attribution = excluded.attribution,
  license_notes = excluded.license_notes;

insert into public.species (id, common_name, normalized_common_name, scientific_name)
values
  ('10000000-0000-4000-8000-000000000001', 'Largemouth Bass', 'largemouth bass', 'Micropterus salmoides'),
  ('10000000-0000-4000-8000-000000000002', 'Smallmouth Bass', 'smallmouth bass', 'Micropterus dolomieu'),
  ('10000000-0000-4000-8000-000000000003', 'Chain Pickerel', 'chain pickerel', 'Esox niger'),
  ('10000000-0000-4000-8000-000000000004', 'Northern Pike', 'northern pike', 'Esox lucius'),
  ('10000000-0000-4000-8000-000000000005', 'Muskellunge', 'muskellunge', 'Esox masquinongy'),
  ('10000000-0000-4000-8000-000000000006', 'Walleye', 'walleye', 'Sander vitreus'),
  ('10000000-0000-4000-8000-000000000007', 'Striped Bass', 'striped bass', 'Morone saxatilis'),
  ('10000000-0000-4000-8000-000000000008', 'Hybrid Striped Bass', 'hybrid striped bass', 'Morone chrysops × Morone saxatilis'),
  ('10000000-0000-4000-8000-000000000009', 'Channel Catfish', 'channel catfish', 'Ictalurus punctatus'),
  ('10000000-0000-4000-8000-000000000010', 'Black Crappie', 'black crappie', 'Pomoxis nigromaculatus'),
  ('10000000-0000-4000-8000-000000000011', 'White Crappie', 'white crappie', 'Pomoxis annularis'),
  ('10000000-0000-4000-8000-000000000012', 'Yellow Perch', 'yellow perch', 'Perca flavescens'),
  ('10000000-0000-4000-8000-000000000013', 'Bluegill', 'bluegill', 'Lepomis macrochirus'),
  ('10000000-0000-4000-8000-000000000014', 'Pumpkinseed', 'pumpkinseed', 'Lepomis gibbosus'),
  ('10000000-0000-4000-8000-000000000015', 'Brown Trout', 'brown trout', 'Salmo trutta'),
  ('10000000-0000-4000-8000-000000000016', 'Rainbow Trout', 'rainbow trout', 'Oncorhynchus mykiss'),
  ('10000000-0000-4000-8000-000000000017', 'Brook Trout', 'brook trout', 'Salvelinus fontinalis')
on conflict (id) do update set
  common_name = excluded.common_name,
  normalized_common_name = excluded.normalized_common_name,
  scientific_name = excluded.scientific_name;

insert into public.species_alias (species_id, source_id, alias, normalized_alias)
values
  ('10000000-0000-4000-8000-000000000001', null, 'LMB', 'lmb'),
  ('10000000-0000-4000-8000-000000000001', null, 'Large Mouth Bass', 'large mouth bass'),
  ('10000000-0000-4000-8000-000000000002', null, 'SMB', 'smb'),
  ('10000000-0000-4000-8000-000000000005', null, 'Musky', 'musky'),
  ('10000000-0000-4000-8000-000000000008', null, 'Wiper', 'wiper'),
  ('10000000-0000-4000-8000-000000000009', null, 'Channel Cat', 'channel cat'),
  ('10000000-0000-4000-8000-000000000010', null, 'Calico Bass', 'calico bass'),
  ('10000000-0000-4000-8000-000000000016', null, 'Rainbows', 'rainbows')
on conflict (source_id, normalized_alias) do update set
  species_id = excluded.species_id,
  alias = excluded.alias;
