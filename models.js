const { Sequelize, DataTypes } = require('sequelize');

// Update the connection string with your actual database credentials
const sequelize = new Sequelize('postgres://username:password@localhost:5432/yourdb');

// Apartment model
const Apartment = sequelize.define('Apartment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  city: DataTypes.STRING,
  area: DataTypes.STRING,
  contract_type: DataTypes.STRING,
  price_per_month: DataTypes.INTEGER,
  num_rooms: DataTypes.INTEGER,
  features: DataTypes.ARRAY(DataTypes.STRING),
  date_of_entry: DataTypes.DATE
}, {
  tableName: 'apartments',
  timestamps: false
});

// UserApartmentPref model
const UserApartmentPref = sequelize.define('UserApartmentPref', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true },
  preferred_city: DataTypes.STRING,
  preferred_area: DataTypes.STRING,
  preferred_contract_type: DataTypes.STRING,
  preferred_features: DataTypes.ARRAY(DataTypes.STRING),
  preferred_num_rooms: DataTypes.ARRAY(DataTypes.FLOAT),
  preferred_price_min: DataTypes.INTEGER,
  preferred_price_max: DataTypes.INTEGER,
  preferred_date_of_entry: DataTypes.DATE
}, {
  tableName: 'user_apartment_search_preferences',
  timestamps: false
});

// UserPreference model
const UserPreference = sequelize.define('UserPreference', {
  user_id: { type: DataTypes.INTEGER, primaryKey: true },
  works_from_home: DataTypes.BOOLEAN,
  shares_cleaning: DataTypes.BOOLEAN,
  has_or_wants_pet: DataTypes.BOOLEAN,
  smokes: DataTypes.BOOLEAN,
  ok_with_smoker: DataTypes.BOOLEAN,
  cleanliness_importance: DataTypes.INTEGER,
  cleaning_frequency: DataTypes.STRING,
  guest_frequency: DataTypes.STRING,
  noise_sensitivity: DataTypes.STRING
}, {
  tableName: 'user_preferences',
  timestamps: false
});

module.exports = {
  sequelize,
  Apartment,
  UserApartmentPref,
  UserPreference
}; 