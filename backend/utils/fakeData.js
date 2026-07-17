const { faker } = require('@faker-js/faker');

// Seed for reproducibility within a test run; each job gets its own counter.
let _counter = 0;

function nextSeed() {
  return ++_counter * 997;
}

function fakeName() {
  faker.seed(nextSeed());
  return faker.person.fullName();
}

function fakeEmail() {
  faker.seed(nextSeed());
  return faker.internet.email().toLowerCase();
}

function fakePhone() {
  faker.seed(nextSeed());
  // Generate Indian-style phone so it looks realistic for the demo doc
  const digits = faker.string.numeric(10);
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

function fakeCompany() {
  faker.seed(nextSeed());
  return faker.company.name();
}

function fakeAddress() {
  faker.seed(nextSeed());
  return `${faker.location.buildingNumber()} ${faker.location.street()}, ${faker.location.city()} - ${faker.string.numeric(6)}`;
}

function fakeSSN() {
  faker.seed(nextSeed());
  const a = faker.string.numeric(3);
  const b = faker.string.numeric(2);
  const c = faker.string.numeric(4);
  return `${a}-${b}-${c}`;
}

function fakeCreditCard() {
  faker.seed(nextSeed());
  // Always generate a Visa-format 16-digit number (starts with 4)
  return faker.finance.creditCardNumber('visa');
}

function fakeDOB() {
  faker.seed(nextSeed());
  const d = faker.date.birthdate({ min: 25, max: 65, mode: 'age' });
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function fakeIP() {
  faker.seed(nextSeed());
  return faker.internet.ipv4();
}

module.exports = {
  fakeName,
  fakeEmail,
  fakePhone,
  fakeCompany,
  fakeAddress,
  fakeSSN,
  fakeCreditCard,
  fakeDOB,
  fakeIP,
};
