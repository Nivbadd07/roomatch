import pkg from 'sequelize';
const { Sequelize, DataTypes, Op } = pkg;

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
  id: { 
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: DataTypes.UUIDV4
  },
  city: DataTypes.STRING,
  area: DataTypes.STRING,
  contract_type: DataTypes.STRING,
  price_per_month: DataTypes.INTEGER,
  num_rooms: DataTypes.INTEGER,
  features: DataTypes.ARRAY(DataTypes.STRING),
  date_of_entry: DataTypes.DATE,
  roommate_id: DataTypes.ARRAY(DataTypes.BIGINT) // INT8 array
}, {
  tableName: 'apartments',
  timestamps: false
});

// UserApartmentPref model
export const UserApartmentPref = sequelize.define('UserApartmentPref', {
  user_id: { type: DataTypes.BIGINT, primaryKey: true }, // INT8
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
  user_id: { type: DataTypes.BIGINT, primaryKey: true }, // INT8
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
  id: { type: DataTypes.BIGINT, primaryKey: true }, // INT8
  user_type: DataTypes.STRING,
  full_name: DataTypes.STRING,
  email: DataTypes.STRING,
  profile_image_url: DataTypes.STRING,
  age: DataTypes.INTEGER,
  // Add other fields as needed
}, {
  tableName: 'users',
  timestamps: false
});

// Define associations
User.hasOne(UserPreference, { foreignKey: 'user_id', as: 'preferences' });
UserPreference.belongsTo(User, { foreignKey: 'user_id' });

User.hasOne(UserApartmentPref, { foreignKey: 'user_id', as: 'apartmentPreferences' });
UserApartmentPref.belongsTo(User, { foreignKey: 'user_id' });

export { sequelize, Op }; 