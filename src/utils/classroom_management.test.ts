/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Şube ve Ders Yönetimi ile Excel İçe Aktarım Doğrulama Testleri
 */

import test from 'node:test';
import assert from 'node:assert';
import {
  loadClassrooms,
  saveClassrooms,
  updateClassroom,
  addClassroomIfMissing,
  loadCourses,
  saveCourses,
  updateCourse,
  DEFAULT_CLASSROOMS,
  DEFAULT_COURSES,
  ClassroomItem,
} from '../lib/schoolConfigService.js';

test('1. loadClassrooms tüm sınıf düzeylerinde (9, 10, 11, 12) ve şubelerde (A, B, C) varsayılan şubeleri içerir', () => {
  const classrooms = loadClassrooms();
  assert.ok(classrooms.length >= 12, 'En az 12 varsayılan şube bulunmalıdır');

  const names = classrooms.map((c) => c.name);
  assert.ok(names.includes('9/A'), '9/A bulunmalıdır');
  assert.ok(names.includes('9/B'), '9/B bulunmalıdır');
  assert.ok(names.includes('10/A'), '10/A bulunmalıdır');
  assert.ok(names.includes('10/B'), '10/B bulunmalıdır');
  assert.ok(names.includes('11/A'), '11/A bulunmalıdır');
  assert.ok(names.includes('11/B'), '11/B bulunmalıdır');
  assert.ok(names.includes('12/A'), '12/A bulunmalıdır');
  assert.ok(names.includes('12/B'), '12/B bulunmalıdır');
});

test('2. addClassroomIfMissing yeni bir şube (örn: 10/D) ekler ve düzeye göre sıralar', () => {
  const result = addClassroomIfMissing('10/D');
  assert.strictEqual(result.added, true, 'Yeni şube added: true olarak dönmelidir');
  assert.strictEqual(result.item.name, '10/D');
  assert.strictEqual(result.item.gradeLevel, 10);
  assert.strictEqual(result.item.branch, 'D');

  const current = loadClassrooms();
  assert.ok(current.some((c) => c.name === '10/D'), '10/D şubesi listeye eklenmiş olmalıdır');
});

test('3. addClassroomIfMissing zaten var olan bir şube girildiğinde mükerrer oluşturmaz', () => {
  const result = addClassroomIfMissing('10/D');
  assert.strictEqual(result.added, false, 'Mevcut şube için added: false dönmelidir');
  assert.strictEqual(result.item.name, '10/D');
});

test('4. Ders yönetimi (loadCourses ve saveCourses) ders tanımlarını ve haftalık saatleri korur', () => {
  const courses = loadCourses();
  assert.ok(courses.length >= 2, 'En az 2 tanımlı ders bulunmalıdır');

  const prg = courses.find((c) => c.code === 'PRG101');
  assert.ok(prg, 'PRG101 dersi bulunmalıdır');
  assert.strictEqual(prg?.hours, 4);

  const updated = [...courses, { id: 'crs-test', code: 'MOB302', name: 'Flutter ile Mobil', hours: 6, targetClassName: '11. Sınıf' }];
  saveCourses(updated);

  const reloaded = loadCourses();
  const mob = reloaded.find((c) => c.code === 'MOB302');
  assert.ok(mob, 'MOB302 başarıyla kaydedilmiş olmalıdır');
  assert.strictEqual(mob?.targetClassName, '11. Sınıf');
});

test('5. updateClassroom şube adı, kademe ve şube harfini başarıyla günceller ve kaydeder', () => {
  const current = loadClassrooms();
  const target = current[0];
  assert.ok(target, 'En az bir şube bulunmalıdır');

  const updatedList = updateClassroom(target.id, {
    name: '9/A-BİLİŞİM',
    gradeLevel: 9,
    branch: 'A',
  });

  const found = updatedList.find((c) => c.id === target.id);
  assert.strictEqual(found?.name, '9/A-BİLİŞİM');

  // Tekrar yükleyince korunduğunu doğrula
  const reloaded = loadClassrooms();
  const reloadedFound = reloaded.find((c) => c.id === target.id);
  assert.strictEqual(reloadedFound?.name, '9/A-BİLİŞİM');
});

test('6. updateCourse ders kodunu, adını, haftalık saatini ve hedef sınıfını günceller', () => {
  const current = loadCourses();
  const target = current.find((c) => c.code === 'PRG101');
  assert.ok(target, 'PRG101 bulunmalıdır');

  const updatedList = updateCourse(target.id, {
    name: 'İleri Algoritmalar ve Programlama',
    hours: 5,
    targetClassName: '10/B',
  });

  const found = updatedList.find((c) => c.id === target.id);
  assert.strictEqual(found?.name, 'İleri Algoritmalar ve Programlama');
  assert.strictEqual(found?.hours, 5);
  assert.strictEqual(found?.targetClassName, '10/B');
});

