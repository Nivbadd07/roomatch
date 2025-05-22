import { Sequelize, DataTypes, Op } from 'sequelize';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. Please check your .env file or Cloud Run environment variables.');
}

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
  logging: false,
});

// Apartment model
export const Apartment = sequelize.define('Apartment', {
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
export const UserApartmentPref = sequelize.define('UserApartmentPref', {
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
export const UserPreference = sequelize.define('UserPreference', {
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

// User model
export const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  user_type: DataTypes.STRING,
  // Add other fields as needed
}, {
  tableName: 'users',
  timestamps: false
});

export { sequelize, Op }; 