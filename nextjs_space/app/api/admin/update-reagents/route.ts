import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds timeout

// Dados da planilha de atualização
const REAGENT_UPDATES = [
  { codigo: 'LERP-C1553', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2029-05-01' },
  { codigo: 'LERP-D3295', marca: 'ok', quantidade: '2,5L', concentracao: '0.999', validade: '2026-06-18' },
  { codigo: 'LERP-J1689', marca: 'ok', quantidade: '2,5L', concentracao: '0.999', validade: '2026-06-18' },
  { codigo: 'LERP-T7844', marca: 'ok', quantidade: '2,5L', concentracao: '0.999', validade: '2025-01-01' },
  { codigo: 'LERP-D9701', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2024-03-01' },
  { codigo: 'LERP-G1499', marca: 'ok', quantidade: '1L', concentracao: '1', validade: '2026-08-01' },
  { codigo: 'LERP-X4518', marca: 'ok', quantidade: '1L', concentracao: '0.999', validade: '2020-04-01' },
  { codigo: 'LERP-H1610', marca: 'ok', quantidade: '1L', concentracao: '0.998', validade: '2022-05-01' },
  { codigo: 'LERP-F2601', marca: 'ok', quantidade: '1L', concentracao: '0.998', validade: '2012-08-14' },
  { codigo: 'LERP-C9295', marca: 'ok', quantidade: '1L', concentracao: '0.985', validade: '2027-07-03' },
  { codigo: 'LERP-L8356', marca: 'ok', quantidade: '1L', concentracao: '0.998', validade: '2012-08-14' },
  { codigo: 'LERP-M2634', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2026-04-15' },
  { codigo: 'LERP-F8265', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2012-08-14' },
  { codigo: 'LERP-V4777', marca: 'Dinâmica', quantidade: '1L', concentracao: '0.998', validade: '2016-04-01' },
  { codigo: 'LERP-Z9909', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2026-04-15' },
  { codigo: 'LERP-M1231', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2027-07-03' }, // Código corrigido
  { codigo: 'LERP-W6595', marca: 'ok', quantidade: '1L', concentracao: '0.998', validade: '2013-02-03' },
  { codigo: 'LERP-C6963', marca: 'ok', quantidade: '1L', concentracao: '0.998', validade: '2026-04-15' },
  { codigo: 'LERP-O9620', marca: 'ok', quantidade: '1L', concentracao: '0.998', validade: '2016-03-01' },
  { codigo: 'LERP-Z1332', marca: 'ok', quantidade: '1L', concentracao: '0.998', validade: '2025-08-01' },
  { codigo: 'LERP-J1800', marca: 'ok', quantidade: '1L', concentracao: '0.998', validade: '2025-08-01' },
  { codigo: 'LERP-F7928', marca: 'Synth', quantidade: '1L', concentracao: 'PA', validade: '2028-05-13' },
  { codigo: 'LERP-L8769', marca: 'Synth', quantidade: '1L', concentracao: 'PA', validade: '2028-05-13' },
  { codigo: 'LERP-U9004', marca: 'ok', quantidade: '1L', concentracao: '0.995', validade: '2006-02-01' },
  { codigo: 'LERP-N7424', marca: 'purion', quantidade: '1L', concentracao: 'PA', validade: '2026-01-28' },
  { codigo: 'LERP-Z7315', marca: 'Synth', quantidade: '1L', concentracao: 'PA', validade: '2028-05-13' },
  { codigo: 'LERP-Y9885', marca: 'purion', quantidade: '1L', concentracao: 'PA', validade: '2026-01-28' },
  { codigo: 'LERP-J1570', marca: 'Merck', quantidade: '4L', concentracao: '1', validade: '2027-09-30' },
  { codigo: 'LERP-S1835', marca: 'ok', quantidade: '1L', concentracao: '0.99', validade: '2021-09-05' },
  { codigo: 'LERP-E5304', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2017-09-01' },
  { codigo: 'LERP-V4098', marca: 'Merck', quantidade: '4L', concentracao: '1', validade: '2027-09-30' },
  { codigo: 'LERP-B6455', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2027-03-14' },
  { codigo: 'LERP-J3350', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2027-03-14' },
  { codigo: 'LERP-S7054', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2030-05-18' },
  { codigo: 'LERP-W9605', marca: 'ok', quantidade: '1L', concentracao: '1', validade: '2016-08-01' },
  { codigo: 'LERP-R3305', marca: 'ok', quantidade: '1L', concentracao: '0.998', validade: '2025-07-01' },
  { codigo: 'LERP-M4286', marca: 'ok', quantidade: '100 mL', concentracao: '0.99', validade: 'n/d' },
  { codigo: 'LERP-X3459', marca: 'ok', quantidade: 'n/d', concentracao: '0.99', validade: 'n/d' },
  { codigo: 'LERP-D5861', marca: 'ok', quantidade: '1L', concentracao: '0.99', validade: '2009-12-01' },
  { codigo: 'LERP-K3984', marca: 'ok', quantidade: '1L', concentracao: '0.995', validade: '2014-05-01' }, // Código corrigido LEPR→LERP
  { codigo: 'LERP-X7943', marca: 'ok', quantidade: '1L', concentracao: '99%', validade: '2009-12-01' }, // Código corrigido LEPR→LERP
  { codigo: 'LERP-E8024', marca: 'ok', quantidade: '1L', concentracao: '0.995', validade: '2014-05-01' },
  { codigo: 'LERP-P8701', marca: 'ok', quantidade: 'n/d', concentracao: 'n/d', validade: '2024-12-13' },
  { codigo: 'LERP-S8851', marca: 'ok', quantidade: '50g', concentracao: 'n/d', validade: 'n/d' },
  { codigo: 'LERP-K3470', marca: 'ok', quantidade: '0,25L', concentracao: '99%', validade: 'n/d' },
  { codigo: 'LERP-A5906', marca: 'ok', quantidade: '25g', concentracao: '0.99', validade: '2024-04-24' },
  { codigo: 'LERP-O1820', marca: 'ok', quantidade: '1kg', concentracao: '0.93', validade: '2027-09-28' },
  { codigo: 'LERP-R9114', marca: 'ok', quantidade: '500g', concentracao: '0.99', validade: '2025-09-02' },
  { codigo: 'LERP-Z8484', marca: 'ok', quantidade: '0,5 kg', concentracao: 'n/d', validade: '2024-01-02' },
  { codigo: 'LERP-F3823', marca: 'ok', quantidade: '1L', concentracao: '0.995', validade: '2014-05-01' },
  { codigo: 'LERP-L2037', marca: 'ok', quantidade: '1L', concentracao: '0.995', validade: '2014-05-01' },
  { codigo: 'LERP-C8135', marca: 'ok', quantidade: '25g', concentracao: '0.98', validade: '2025-08-29' },
  { codigo: 'LERP-D7772', marca: 'ok', quantidade: '50g', concentracao: '0.99', validade: '2026-03-23' },
  { codigo: 'LERP-N3255', marca: 'ok', quantidade: '1L', concentracao: '0.99', validade: '2019-08-31' },
  { codigo: 'LERP-T2040', marca: 'ok', quantidade: '50g', concentracao: '0.99', validade: '2026-11-27' },
  { codigo: 'LERP-N8864', marca: 'ok', quantidade: 'n/d', concentracao: '45% PBAT', validade: 'n/d' },
  { codigo: 'LERP-I2150', marca: 'ok', quantidade: '1kg', concentracao: '0.97', validade: '2028-05-01' },
  { codigo: 'LERP-P1534', marca: 'ok', quantidade: '1kg', concentracao: '0.99', validade: 'n/d' },
  { codigo: 'LERP-B9140', marca: 'ok', quantidade: '1kg', concentracao: 'n/d', validade: '2025-10-07' },
  { codigo: 'LERP-D1930', marca: 'ok', quantidade: '10 g', concentracao: '0.98', validade: '2027-06-28' },
  { codigo: 'LERP-Y4056', marca: 'ok', quantidade: '50g', concentracao: '0.97', validade: 'n/d' },
  { codigo: 'LERP-H4056', marca: 'ok', quantidade: '1L', concentracao: '0.995', validade: '2025-02-03' },
  { codigo: 'LERP-S6115', marca: 'ok', quantidade: '50g', concentracao: '0.97', validade: 'n/d' },
  { codigo: 'LERP-R1563', marca: 'ok', quantidade: '500g', concentracao: '0.1', validade: '2027-04-14' },
  { codigo: 'LERP-N7450', marca: 'ok', quantidade: '100g', concentracao: '0.99', validade: 'n/d' },
  { codigo: 'LERP-F4985', marca: 'ok', quantidade: 'n/d', concentracao: '86% PBAT', validade: 'n/d' },
  { codigo: 'LERP-J2252', marca: 'Nuclear', quantidade: '1L', concentracao: '0.985', validade: '2024-05-01' },
  { codigo: 'LERP-T1501', marca: 'OK', quantidade: '1000g', concentracao: '0.99', validade: '2020-04-27' },
  { codigo: 'LERP-Y7274', marca: 'OK', quantidade: '500g', concentracao: 'n/d', validade: '2023-12-04' },
  { codigo: 'LERP-S1181', marca: 'OK', quantidade: '500g', concentracao: 'N/D', validade: '2019-02-04' },
  { codigo: 'LERP-9888', marca: 'OK', quantidade: '500g', concentracao: 'N/D', validade: '2024-01-31' },
  { codigo: 'LERP-D8562', marca: 'OK', quantidade: '1L', concentracao: '0.995', validade: '2029-06-04' },
  { codigo: 'LERP-O8304', marca: 'OK', quantidade: '1L', concentracao: '0.995', validade: '2029-06-04' },
  { codigo: 'LERP-C6176', marca: 'OK', quantidade: '500g', concentracao: '0.98', validade: '2023-05-01' }, // Código corrigido LERPC→LERP-C
  { codigo: 'LERP-J6295', marca: 'OK', quantidade: '1000g', concentracao: '0.99', validade: '2024-02-18' },
  { codigo: 'LERP-E2488', marca: 'OK', quantidade: '1000g', concentracao: '0.85', validade: '2012-11-01' },
  { codigo: 'LERP-T8045', marca: 'OK', quantidade: '1L', concentracao: '0.995', validade: '2017-07-21' },
  { codigo: 'LERP-S7413', marca: 'OK', quantidade: '1000g', concentracao: '0.85', validade: '2012-11-01' },
  { codigo: 'LERP-V6203', marca: 'OK', quantidade: '1000g', concentracao: '0.97', validade: '2013-01-01' },
  { codigo: 'LERP-E5838', marca: 'OK', quantidade: '1000g', concentracao: '0.98', validade: '2014-06-08' },
  { codigo: 'LERP-M2147', marca: 'OK', quantidade: '1000g', concentracao: 'N/D', validade: '2027-10-12' },
  { codigo: 'LERP-R4524', marca: 'OK', quantidade: '100g', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-A1933', marca: 'OK', quantidade: '100g', concentracao: '0.99', validade: '2027-03-19' },
  { codigo: 'LERP-J1393', marca: 'OK', quantidade: '500g', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-6204', marca: 'OK', quantidade: '100mL', concentracao: '0.99', validade: '2023-09-29' },
  { codigo: 'LERP-S7713', marca: 'OK', quantidade: '100g', concentracao: 'N/D', validade: '2022-08-01' },
  { codigo: 'LERP-C1944', marca: 'OK', quantidade: '500g', concentracao: '0.99', validade: 'N/D' },
  { codigo: 'LERP-2404', marca: 'OK', quantidade: 'N/D', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-P3919', marca: 'OK', quantidade: '500mL', concentracao: 'N/D', validade: '2017-08-01' },
  { codigo: 'LERP-M5648', marca: 'OK', quantidade: '1000mL', concentracao: '0.25', validade: '2021-02-01' },
  { codigo: 'LERP-V8120', marca: 'OK', quantidade: '500g', concentracao: '0.99', validade: '2027-03-01' },
  { codigo: 'LERP-E9864', marca: 'OK', quantidade: '25g', concentracao: '0.99', validade: 'N/D' },
  { codigo: 'LERP-B2129', marca: 'OK', quantidade: '500g', concentracao: 'N/D', validade: '2026-08-01' },
  { codigo: 'LERP-U9381', marca: 'OK', quantidade: '1L', concentracao: '0.29', validade: '2012-04-09' },
  { codigo: 'LERP-C1945', marca: 'OK', quantidade: 'N/D', concentracao: 'N/D', validade: '2007-05-01' },
  { codigo: 'LERP-W5104', marca: 'OK', quantidade: '500g', concentracao: 'N/D', validade: '2012-07-01' },
  { codigo: 'LERP-J1777', marca: 'OK', quantidade: '100g', concentracao: 'N/D', validade: '2014-08-01' },
  { codigo: 'LERP-Y6219', marca: 'OK', quantidade: '25g', concentracao: 'N/D', validade: '2016-09-11' },
  { codigo: 'LERP-E8926', marca: 'OK', quantidade: '100g', concentracao: '0.995', validade: '2026-12-01' },
  { codigo: 'LERP-H4059', marca: 'OK', quantidade: '100mL', concentracao: '0.99', validade: '2022-07-31' },
  { codigo: 'LERP-H4584', marca: 'OK', quantidade: '1000mL', concentracao: '0.995', validade: '2023-04-03' },
  { codigo: 'LERP-G7450', marca: 'OK', quantidade: '500mL', concentracao: 'N/D', validade: '2018-09-04' },
  { codigo: 'LERP-V539', marca: 'OK', quantidade: '50g', concentracao: '0.93', validade: 'N/D' },
  { codigo: 'LERP-F6537', marca: 'OK', quantidade: '1Kg', concentracao: '0.97', validade: '2014-01-01' },
  { codigo: 'LERP-L8995', marca: 'OK', quantidade: '1000g', concentracao: '0.99', validade: '2022-09-22' },
  { codigo: 'LERP-D9497', marca: 'OK', quantidade: '50g', concentracao: '0.93', validade: 'N/D' },
  { codigo: 'LERP-A1727', marca: 'OK', quantidade: 'N/D', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-A8807', marca: 'OK', quantidade: '500g', concentracao: '0.99', validade: '2020-07-01' },
  { codigo: 'LERP-E9038', marca: 'OK', quantidade: '500g', concentracao: '0.99', validade: '2021-06-01' },
  { codigo: 'LERP-N1891', marca: 'OK', quantidade: '500g', concentracao: 'N/D', validade: '2017-03-15' },
  { codigo: 'LERP-Z9066', marca: 'OK', quantidade: '500g', concentracao: '0.995', validade: '2017-01-01' },
  { codigo: 'LERP-Q5635', marca: 'OK', quantidade: '500g', concentracao: '0.99', validade: '2021-06-01' },
  { codigo: 'LERP-G1141', marca: 'OK', quantidade: '250g', concentracao: '0.8', validade: 'N/D' },
  { codigo: 'LERP-D2117', marca: 'OK', quantidade: '1000g', concentracao: '0.9997', validade: '2026-07-10' },
  { codigo: 'LERP-M4255', marca: 'OK', quantidade: '500g', concentracao: '0.98', validade: '2013-02-01' },
  { codigo: 'LERP-Y7504', marca: 'OK', quantidade: '1L', concentracao: '0.32', validade: '2028-05-18' },
  { codigo: 'LERP-F4938', marca: 'OK', quantidade: '1L', concentracao: '0.995', validade: '2010-08-15' },
  { codigo: 'LERP-V2388', marca: 'OK', quantidade: '500g', concentracao: '0.99', validade: '2024-03-01' },
  { codigo: 'LERP-E1131', marca: 'OK', quantidade: '500g', concentracao: '0.99', validade: '2021-07-31' },
  { codigo: 'LERP-A2226', marca: 'OK', quantidade: '500g', concentracao: '0.96', validade: '2021-02-01' },
  { codigo: 'LERP-A7786', marca: 'OK', quantidade: '3,5Kg', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-Z7132', marca: 'OK', quantidade: '500mL', concentracao: '0.94', validade: '2025-10-31' },
  { codigo: 'LERP-N5115', marca: 'OK', quantidade: '1000g', concentracao: '0.99', validade: '2024-07-20' },
  { codigo: 'LERP-B7391', marca: 'OK', quantidade: '500g', concentracao: '0.99', validade: '2024-03-01' },
  { codigo: 'LERP-N3242', marca: 'OK', quantidade: '100mg', concentracao: '0.995', validade: '2016-04-11' },
  { codigo: 'LERP-K5773', marca: 'OK', quantidade: '100mg', concentracao: '0.995', validade: '2016-04-11' },
  { codigo: 'LERP-F4109', marca: 'OK', quantidade: '1L', concentracao: '0.998', validade: '2025-08-01' },
  { codigo: 'LERP-7390', marca: 'OK', quantidade: '1L', concentracao: '0.998', validade: '2029-11-24' },
  { codigo: 'LERP-E4900', marca: 'OK', quantidade: '1L', concentracao: '0.998', validade: '2029-11-24' },
  { codigo: 'LERP-P2794', marca: 'OK', quantidade: '1L', concentracao: '0.998', validade: '2029-11-24' },
  { codigo: 'LERP-X2512', marca: 'OK', quantidade: '500g', concentracao: 'N/D', validade: '2024-07-17' },
  { codigo: 'LERP-Y1783', marca: 'OK', quantidade: '1L', concentracao: '0.995', validade: '2013-04-01' },
  { codigo: 'LERP-Y1655', marca: 'OK', quantidade: '500g', concentracao: 'N/D', validade: '2024-07-17' },
  { codigo: 'LERP-L6134', marca: 'OK', quantidade: '1L', concentracao: '0.995', validade: '2013-04-01' },
  { codigo: 'LERP-J4482', marca: 'OK', quantidade: '10g', concentracao: '0.98', validade: 'N/D' },
  { codigo: 'LERP-J3116', marca: 'OK', quantidade: '1L', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-O4602', marca: 'OK', quantidade: '500g', concentracao: '0.98', validade: '2026-04-01' },
  { codigo: 'LERP-Q6273', marca: 'OK', quantidade: '1000g', concentracao: '0.99', validade: '2027-12-21' },
  { codigo: 'LERP-E7448', marca: 'OK', quantidade: 'N/D', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-H2718', marca: 'OK', quantidade: '10g', concentracao: '0.97', validade: '2013-04-03' },
  { codigo: 'LERP-L8599', marca: 'Dinamica', quantidade: '500g', concentracao: '0.99', validade: '2023-09-17' },
  { codigo: 'LERP-G6091', marca: 'OK', quantidade: '1000mL', concentracao: 'N/D', validade: '2023-08-29' },
  { codigo: 'LERP-Q2708', marca: 'OK', quantidade: '500g', concentracao: '0.99', validade: '2024-02-01' },
  { codigo: 'LERP-A9993', marca: 'OK', quantidade: '500g', concentracao: '0.99', validade: '2023-01-01' },
  { codigo: 'LERP-O3662', marca: 'OK', quantidade: '500g', concentracao: '0.995', validade: '2020-08-01' },
  { codigo: 'LERP-I8211', marca: 'OK', quantidade: '500g', concentracao: '0.99', validade: '2024-02-01' },
  { codigo: 'LERP-Q6379', marca: 'OK', quantidade: '1L', concentracao: '0.998', validade: '2029-11-24' },
  { codigo: 'LERP-U4954', marca: 'OK', quantidade: '1000g', concentracao: 'PA', validade: '2015-04-04' },
  { codigo: 'LERP-R4404', marca: 'OK', quantidade: '1000g', concentracao: 'PA', validade: '2015-04-04' },
  { codigo: 'LERP-I5851', marca: 'OK', quantidade: '500 ml', concentracao: '0.88', validade: '2014-03-16' },
  { codigo: 'LERP-R4049', marca: 'OK', quantidade: '500 ml', concentracao: '0.88', validade: '2014-03-16' },
  { codigo: 'LERP-07863', marca: 'OK', quantidade: '500 ml', concentracao: '0.88', validade: '2014-03-18' },
  { codigo: 'LERP-O8740', marca: 'ok', quantidade: '1kg', concentracao: '0.8', validade: 'N/D' },
  { codigo: 'LERP-C5301', marca: 'ok', quantidade: '1kg', concentracao: '0.8', validade: 'N/D' },
  { codigo: 'LERP-R2454', marca: 'Ecibra', quantidade: '1L', concentracao: 'PA', validade: '2012-09-01' },
  { codigo: 'LERP-X3786', marca: 'ok', quantidade: '500g', concentracao: 'PA', validade: '2017-01-01' },
  { codigo: 'LERP-T2711', marca: 'ok', quantidade: '25g', concentracao: '0.99', validade: '2022-04-30' },
  { codigo: 'LERP-L6742', marca: 'ok', quantidade: '10g', concentracao: '0.99999', validade: 'n/d' },
  { codigo: 'LERP-D7112', marca: 'ok', quantidade: '250g', concentracao: 'PA', validade: '2024-06-18' },
  { codigo: 'LERP-O5386', marca: 'ok', quantidade: '1000 ml', concentracao: 'PA', validade: '2013-12-01' },
  { codigo: 'LERP-L9985', marca: 'ok', quantidade: '100g', concentracao: '0.98', validade: 'n/d' },
  { codigo: 'LERP-Q1833', marca: 'ok', quantidade: '1000 ml', concentracao: 'PA', validade: '2013-12-01' },
  { codigo: 'LERP-T8318', marca: 'ok', quantidade: '500g', concentracao: 'N/D', validade: '2014-10-01' },
  { codigo: 'LERP-D6983', marca: 'ok', quantidade: '1000g', concentracao: 'PA', validade: '2029-06-04' },
  { codigo: 'LERP-S6546', marca: 'ok', quantidade: '1 kg', concentracao: '0.99', validade: '2024-07-20' },
  { codigo: 'LERP-D7151', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2018-09-01' },
  { codigo: 'LERP-E6022', marca: 'ok', quantidade: '500g', concentracao: '0.398', validade: '2018-07-05' },
  { codigo: 'LERP-M1719', marca: 'ok', quantidade: '5g', concentracao: '0.98', validade: '2023-05-15' },
  { codigo: 'LERP-R5987', marca: 'ok', quantidade: '10g', concentracao: '0.98', validade: '2015-10-08' },
  { codigo: 'LERP-Q5178', marca: 'ok', quantidade: '500g', concentracao: '0.99', validade: '2023-01-01' },
  { codigo: 'LERP-J1337', marca: 'ok', quantidade: '25g', concentracao: 'N/D', validade: '2024-01-25' },
  { codigo: 'LERP-E7840', marca: 'ok', quantidade: '500g', concentracao: '0.999', validade: '2015-06-18' },
  { codigo: 'LERP-J6695', marca: 'ok', quantidade: '25g', concentracao: 'PA', validade: '2018-06-26' },
  { codigo: 'LERP-B4917', marca: 'ok', quantidade: '500g', concentracao: 'PA', validade: '2024-03-01' },
  { codigo: 'LERP-D1368', marca: 'ok', quantidade: '500g', concentracao: 'PA', validade: '2025-12-06' },
  { codigo: 'LERP-D3569', marca: 'ok', quantidade: '500g', concentracao: 'PA', validade: '2025-02-18' },
  { codigo: 'LERP-P607', marca: 'ok', quantidade: '5g', concentracao: '0.99', validade: '2022-04-30' },
  { codigo: 'LERP-N2798', marca: 'ok', quantidade: '250g', concentracao: '0.985', validade: '2012-07-01' },
  { codigo: 'LERP-V6434', marca: 'ok', quantidade: '100ml', concentracao: '0.95', validade: 'n/d' },
  { codigo: 'LERP-R7185', marca: 'ok', quantidade: '100ml', concentracao: '0.95', validade: 'n/d' },
  { codigo: 'LERP-O9894', marca: 'ok', quantidade: '100g', concentracao: '0.97', validade: 'n/d' },
  { codigo: 'LERP-A4574', marca: 'ok', quantidade: '4kg', concentracao: '86% PBAT', validade: 'n/d' },
  { codigo: 'LERP-D1317', marca: 'Ecibra', quantidade: '1000 ml', concentracao: '0.997', validade: '2012-09-01' },
  { codigo: 'LERP-G8809', marca: 'ok', quantidade: '1kg', concentracao: 'n/d', validade: 'n/d' },
  { codigo: 'LERP-L8830', marca: 'Neon', quantidade: '1kg', concentracao: 'PA', validade: 'N/D' },
  { codigo: 'LERP-Z7895', marca: 'ok', quantidade: '500g', concentracao: 'PA', validade: '2012-05-01' },
  { codigo: 'LERP-Z9940', marca: 'Sigma', quantidade: '250g', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-P8114', marca: 'ok', quantidade: '25g', concentracao: '0.98', validade: 'n/d' },
  { codigo: 'LERP-V9733', marca: 'Sigma', quantidade: '250g', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-N9289', marca: 'ok', quantidade: '1000g', concentracao: '0.995', validade: '2026-06-18' },
  { codigo: 'LERP-W7319', marca: 'ok', quantidade: '250g', concentracao: 'N/D', validade: '1997-09-01' },
  { codigo: 'LERP-W4477', marca: 'ok', quantidade: '50g', concentracao: '0.97', validade: 'n/d' },
  { codigo: 'LERP-I2107', marca: 'ok', quantidade: '1kg', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-B8498', marca: 'ok', quantidade: '500g', concentracao: '0.995', validade: '2012-10-01' },
  { codigo: 'LERP-G6242', marca: 'ok', quantidade: '1kg', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-U6895', marca: 'Dinâmica', quantidade: '1000g', concentracao: 'PA', validade: '2033-06-04' },
  { codigo: 'LERP-P6212', marca: 'ok', quantidade: '250g', concentracao: '0.98', validade: '2023-07-05' },
  { codigo: 'LERP-R7843', marca: 'ok', quantidade: '100ml', concentracao: '0.97', validade: 'n/d' },
  { codigo: 'LERP-S2551', marca: 'ok', quantidade: '50g', concentracao: '0.95', validade: '2021-03-02' },
  { codigo: 'LERP-A7132', marca: 'ok', quantidade: '25g', concentracao: '0.97', validade: '2024-02-19' },
  { codigo: 'LERP-V9526', marca: 'ok', quantidade: '250g', concentracao: '0.98', validade: '2023-07-05' },
  { codigo: 'LERP-Y2264', marca: 'ok', quantidade: '1kg', concentracao: 'n/d', validade: 'n/d' },
  { codigo: 'LERP-Q6922', marca: 'Vieira Farm', quantidade: '1kg', concentracao: 'N/D', validade: 'N/D' },
  { codigo: 'LERP-O5908', marca: 'ok', quantidade: '1000g', concentracao: 'N/D', validade: '2014-11-21' },
  { codigo: 'LERP-R8356', marca: 'ok', quantidade: '500g', concentracao: '0.995', validade: '2027-07-13' },
  { codigo: 'LERP-S1799', marca: 'ok', quantidade: '100ml', concentracao: '0.98', validade: '2026-10-05' },
  { codigo: 'LERP-S7494', marca: 'ok', quantidade: '100ml', concentracao: '0.99', validade: '2025-07-02' },
  { codigo: 'LERP-E6188', marca: 'ok', quantidade: '25g', concentracao: '0.98', validade: '2023-07-04' },
  { codigo: 'LERP-S8808', marca: 'ok', quantidade: '1000ml', concentracao: 'PA', validade: '2013-02-01' },
  { codigo: 'LERP-U5547', marca: 'ok', quantidade: '25g', concentracao: '0.97', validade: '2024-02-19' },
  { codigo: 'LERP-D1356', marca: 'ok', quantidade: '100ml', concentracao: '1M in hexane', validade: 'n/d' },
  { codigo: 'LERP-R8612', marca: 'ok', quantidade: '1000ml', concentracao: 'PA', validade: '2027-11-30' },
  { codigo: 'LERP-L3225', marca: 'ok', quantidade: '1000ml', concentracao: 'PA', validade: '2027-11-30' },
  { codigo: 'LERP-F6492', marca: 'ok', quantidade: '1000ml', concentracao: 'PA', validade: '2025-04-20' },
  { codigo: 'LERP-Q1841', marca: 'ok', quantidade: '1000ml', concentracao: 'PA', validade: '2027-11-30' },
  { codigo: 'LERP-H987', marca: 'ok', quantidade: '1000ml', concentracao: 'PA', validade: '2027-11-30' },
  { codigo: 'LERP-N7729', marca: 'ok', quantidade: '1000ml', concentracao: 'PA', validade: '2025-04-20' },
  { codigo: 'LERP-L8552', marca: 'ok', quantidade: '500g', concentracao: 'N/D', validade: '2010-03-24' },
  { codigo: 'LERP-U8130', marca: 'ok', quantidade: '1000ml', concentracao: 'PA', validade: '2025-04-20' },
  { codigo: 'LERP-O2172', marca: 'ok', quantidade: '1L', concentracao: 'n/d', validade: '2026-01-22' },
  { codigo: 'LERP-T5681', marca: 'ok', quantidade: '1L', concentracao: 'n/d', validade: '2020-01-22' },
  { codigo: 'LERP-Z2679', marca: 'NEON', quantidade: '1L', concentracao: 'PA', validade: '2030-05-18' },
  { codigo: 'LERP-E2209', marca: 'NEON', quantidade: '1L', concentracao: 'PA', validade: '2030-05-18' },
  { codigo: 'LERP-S2465', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2030-05-18' },
  { codigo: 'LERP-Q5882', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2030-05-18' },
  { codigo: 'LERP-S3426', marca: 'ok', quantidade: '50g', concentracao: '0.99', validade: 'N/D' },
  { codigo: 'LERP-U4163', marca: 'ok', quantidade: '50g', concentracao: '0.99', validade: 'n/d' },
  { codigo: 'LERP-S8177', marca: 'ok', quantidade: '100ml', concentracao: '0.99', validade: 'n/d' },
  { codigo: 'LERP-T9256', marca: 'ok', quantidade: '50g', concentracao: '0.99', validade: 'n/d' },
  { codigo: 'LERP-W6085', marca: 'ok', quantidade: '5g', concentracao: '0.98', validade: 'n/d' },
  { codigo: 'LERP-L7034', marca: 'ok', quantidade: '500g', concentracao: 'n/d', validade: '2026-07-03' },
  { codigo: 'LERP-K3121', marca: 'ok', quantidade: '100g', concentracao: '0.97', validade: 'n/d' },
  { codigo: 'LERP-L7113', marca: 'ok', quantidade: '1000g', concentracao: 'PA', validade: '2022-08-01' },
  { codigo: 'LERP-A6899', marca: 'ok', quantidade: '1000ml', concentracao: 'PA', validade: '2027-11-30' },
  { codigo: 'LERP-K4118', marca: 'ok', quantidade: '1L', concentracao: '0.75', validade: '2026-09-18' },
  { codigo: 'LERP-I6010', marca: 'ok', quantidade: '1L', concentracao: 'PA', validade: '2013-02-01' },
  { codigo: 'LERP-E5085', marca: 'OK', quantidade: '100g', concentracao: '0.99', validade: '2025-04-23' },
  { codigo: 'LERP-I5427', marca: 'ok', quantidade: '25g', concentracao: '0.98', validade: 'n/d' },
  { codigo: 'LERP-C7795', marca: 'ok', quantidade: '5g', concentracao: 'n/d', validade: '2025-10-04' },
  { codigo: 'LERP-T3378', marca: 'ok', quantidade: '2g', concentracao: 'n/d', validade: '2027-07-31' },
  { codigo: 'LERP-I5347', marca: 'ok', quantidade: '5g', concentracao: 'n/d', validade: 'n/d' },
  { codigo: 'LERP-P7495', marca: 'Ciba', quantidade: '100g', concentracao: 'n/d', validade: 'n/d' },
  { codigo: 'LERP-U3160', marca: 'ok', quantidade: '100ml', concentracao: '0.2M in toluene', validade: '2025-02-12' },
  { codigo: 'LERP-X4909', marca: 'ok', quantidade: '1L', concentracao: '0.98', validade: 'n/d' },
  { codigo: 'LERP-J7193', marca: 'ok', quantidade: '2g', concentracao: '0.98', validade: '2027-10-23' },
  { codigo: 'LERP-Z8236', marca: 'ok', quantidade: '250ml', concentracao: 'n/d', validade: 'n/d' },
  { codigo: 'LERP-V4544', marca: 'ok', quantidade: '1g', concentracao: 'n/d', validade: '2025-01-31' },
  { codigo: 'LERP-G2865', marca: 'ok', quantidade: '100ml', concentracao: '0.7', validade: '2020-07-03' },
  { codigo: 'LERP-S7620', marca: 'ok', quantidade: '2,593kg', concentracao: '1', validade: 'n/d' },
  { codigo: 'LERP-M5226', marca: 'ok', quantidade: '1,259kg', concentracao: '1', validade: 'n/d' },
  { codigo: 'LERP-L9359', marca: 'ok', quantidade: '2,092kg', concentracao: '1', validade: 'n/d' },
  { codigo: 'LERP-Q1262', marca: 'ok', quantidade: '4,2kg', concentracao: '1', validade: 'n/d' },
];

// Função para normalizar códigos (alguns tem erros de digitação)
function normalizeCodigo(codigo: string): string {
  // LERP´-M1231 → LERP-M1231
  codigo = codigo.replace('LERP´-', 'LERP-');
  // LEPR-X7943 → LERP-X7943
  codigo = codigo.replace('LEPR-', 'LERP-');
  // LERPC6176 → LERP-C6176
  codigo = codigo.replace('LERPC', 'LERP-C');
  return codigo;
}

// Função para processar validade
function processValidade(validade: string): { date: Date | null; indeterminada: boolean } {
  const val = validade.toLowerCase().trim();
  
  if (val === 'n/d' || val === 'n.d.' || val === '') {
    return { date: null, indeterminada: true };
  }
  
  try {
    const date = new Date(validade);
    if (isNaN(date.getTime())) {
      return { date: null, indeterminada: true };
    }
    return { date, indeterminada: false };
  } catch {
    return { date: null, indeterminada: true };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar se é admin
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    console.log('📋 Starting reagent updates...');

    const results = {
      total: REAGENT_UPDATES.length,
      updated: 0,
      notFound: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const item of REAGENT_UPDATES) {
      try {
        const codigo = normalizeCodigo(item.codigo);
        
        // Buscar reagente entrada (frasco) pelo código interno
        const entrada = await prisma.reagenteEntrada.findUnique({
          where: { codigoInterno: codigo },
        });

        if (!entrada) {
          console.log(`⚠️  Not found: ${codigo}`);
          results.notFound++;
          results.details.push({ codigo, status: 'not_found' });
          continue;
        }

        // Preparar dados para atualização
        const updateData: any = {};

        // 1. Marca: só atualiza se NÃO for "ok" ou "OK"
        if (item.marca && item.marca.toLowerCase() !== 'ok') {
          updateData.marca = item.marca;
        }

        // 2. Quantidade
        const quantidade = item.quantidade?.toLowerCase().trim();
        if (quantidade && quantidade !== 'n/d' && quantidade !== 'n.d.') {
          // Não atualizar quantidadeAtual, apenas manter o registro da quantidade nominal
          // updateData.quantidade poderia ser adicionado se tivesse esse campo
        }

        // 3. Concentração
        const concentracao = item.concentracao?.toUpperCase().trim();
        if (concentracao && concentracao !== 'N/D' && concentracao !== 'N.D.') {
          updateData.concentracao = concentracao;
        }

        // 4. Validade
        const validadeInfo = processValidade(item.validade);
        if (validadeInfo.indeterminada) {
          updateData.validadeIndeterminada = true;
          updateData.dataValidade = null;
        } else if (validadeInfo.date) {
          updateData.validadeIndeterminada = false;
          updateData.dataValidade = validadeInfo.date;
        }

        // Se não há nada para atualizar, pular
        if (Object.keys(updateData).length === 0) {
          console.log(`⏭️  No changes: ${codigo}`);
          continue;
        }

        // Atualizar
        await prisma.reagenteEntrada.update({
          where: { id: entrada.id },
          data: updateData,
        });

        console.log(`✅ Updated: ${codigo}`);
        results.updated++;
        results.details.push({ codigo, status: 'updated', changes: updateData });
      } catch (error: any) {
        console.error(`❌ Error updating ${item.codigo}:`, error);
        results.errors++;
        results.details.push({ codigo: item.codigo, status: 'error', error: error.message });
      }
    }

    console.log('\n📊 Update Summary:');
    console.log(`   Total: ${results.total}`);
    console.log(`   ✅ Updated: ${results.updated}`);
    console.log(`   ⚠️  Not Found: ${results.notFound}`);
    console.log(`   ❌ Errors: ${results.errors}`);

    return NextResponse.json({
      success: true,
      message: 'Reagent updates completed',
      results,
    });
  } catch (error: any) {
    console.error('❌ Error in update process:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update reagents',
        details: error.message,
      },
      { status: 500 }
    );
  }
}
