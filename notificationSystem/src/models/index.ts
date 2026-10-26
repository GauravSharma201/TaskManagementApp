import { sequelize } from '../config/database';
// import Task from './sampleModel.ts;

// import { Model } from '../types/models/model';

const models = {
  // <Sample-Models>,
};

// Set up associations

/*
centralize association of models , protects against 
cyclic dependency issues
*/
Object.keys(models).forEach((modelName) => {
  const model = models[modelName as keyof typeof models] as any;
  if (model.associate) {
    model.associate(models);
  }
});

export { sequelize };

export default models;
