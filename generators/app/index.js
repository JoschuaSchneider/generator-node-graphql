'use strict';
const Generator = require('yeoman-generator');

module.exports = class extends Generator {
  constructor(args, opts) {
    super(args, opts);
    this.argument("parentFolder", { type: String, required: false });
    this.option("default");
  }

  async prompting() {
    if (!this.options.default) {
      this.questions = await this.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: 'what is the name of your project?',
          default: 'node-graphql',
        },
        {
          type: 'list',
          name: 'database',
          message: 'Select the database type: ',
          choices: ['noSQL'],
        },
        {
          type: 'confirm',
          name: 'defaultDB',
          message: 'database connection will be set to the defaults, is this ok?',
          default: true,
        },
        {
          type: 'input',
          name: 'DbHost',
          message: 'enter database host name: ',
          default: 'localhost',
          when: (answers) => answers.defaultDB === false,
        },
        {
          type: 'input',
          name: 'DbPort',
          message: 'enter database port: ',
          default: '27017',
          when: (answers) => answers.defaultDB === false,
        },
        {
          type: 'input',
          name: 'DbName',
          message: 'enter database name: ',
          default: 'node-graphql',
          when: (answers) => answers.defaultDB === false,
        }, // Need to add username and password as well
        {
          type: 'list',
          name: 'auth',
          message: 'Select the auth type: ',
          choices: ['JWT'],
        },
        {
          type: 'input',
          name: 'secretKey',
          message: 'input JWT secret key: ',
          default: 'hwWxD5cB6LtaCB0GOcbaxiOI2eaFoC4rIT9jh51DCdB6p9IZrHTMRuFUM72xIjm',
          when: (answers) => answers.auth === 'JWT',
        },
        {
          type: 'list',
          name: 'packageManager',
          message: 'which package manager do you want to use?',
          choices: ['npm', 'yarn'],
        },
      ]);
    } else {
      this.questions = {};
      this.questions.projectName = 'node-graphql';
      this.questions.database = 'noSQL';
      this.questions.defaultDB = true;
      this.questions.auth = 'JWT';
      this.questions.secretKey = 'hwWxD5cB6LtaCB0GOcbaxiOI2eaFoC4rIT9jh51DCdB6p9IZrHTMRuFUM72xIjm';
      this.questions.packageManager = 'yarn';
    }
  }

  writing() {
    const install = (packages, options) => {
      if (this.questions.packageManager === 'npm') {
        this.npmInstall(packages, options);
      }
      if (this.questions.packageManager === 'yarn') {
        this.yarnInstall(packages, options);
      }
    };

    const parentFolder = this.options.parentFolder ? this.options.parentFolder + "/" : "";
    const db = this.questions.database;
    const auth = this.questions.auth;

    const pkg = this.fs.readJSON(this.destinationPath('package.json'), {
      scripts: {
        dist: 'node -r ts-node/register ./src/server.ts',
        'start:watch': 'nodemon',
        dev: 'nodemon --exec ts-node src/server.ts',
        test: 'jest --runInBand ./tests',
        'clear-cache': 'jest --clearCache',
        coverage: 'jest --coverage',
      },
      jest: {
        testEnvironment: 'node',
        transform: {
          '\\.(gql|graphql)$': 'jest-transform-graphql',
          '^.+\\.jsx?$': 'babel-jest',
          '^.+\\.tsx?$': 'ts-jest',
        },
        collectCoverageFrom: [
          "src/**/*.{ts,js}",
          "!src/server.ts",
        ],
      },
    });

    install([
      'express',
      'apollo-server',
      'apollo-server-express',
      'graphql-import-node',
      '@graphql-tools/merge',
      'dotenv',
    ]);

    install([
      '@types/express',
      '@types/node',
      'eslint',
      'eslint-plugin-import',
      'nodemon',
      'typescript',
      'ts-node',
      '@typescript-eslint/eslint-plugin@latest',
      '@typescript-eslint/parser@latest',
      'jest',
      'ts-jest',
      'faker',
      'easygraphql-tester',
      'jest-transform-graphql',
      '@types/jest',
      'mongodb-memory-server',
    ], { 'save-dev': true });

    if (auth === 'JWT') {
      install([
        'jsonwebtoken',
        'express-jwt',
        'bcrypt',
      ]);
    }

    if (db === 'noSQL') {
      install([
        'mongoose',
      ]);
      install([
        '@types/mongoose',
        'mongodb-memory-server',
      ], { 'save-dev': true });
    }

    this.fs.writeJSON(this.destinationPath(parentFolder + 'package.json'), pkg);

    this.fs.copyTpl(
      this.templatePath('server.ts'),
      this.destinationPath(parentFolder + 'src/server.ts')
    );
    this.fs.copyTpl(
      this.templatePath('gitignore'),
      this.destinationPath(parentFolder + '.gitignore')
    );
    this.fs.copyTpl(
      this.templatePath('.eslintrc.json'),
      this.destinationPath(parentFolder + '.eslintrc.json')
    );
    this.fs.copyTpl(
      this.templatePath('tsconfig.json'),
      this.destinationPath(parentFolder + 'tsconfig.json')
    );
    this.fs.copyTpl(
      this.templatePath('user.graphql'),
      this.destinationPath(parentFolder + 'src/graphql/schemas/user.graphql')
    );
    this.fs.copyTpl(
      this.templatePath('userResolver.ts'),
      this.destinationPath(parentFolder + 'src/graphql/resolvers/userResolver.ts')
    );

    this.fs.copyTpl(this.templatePath('.env'), this.destinationPath(parentFolder + '.env'), {
      dbHost: this.questions.defaultDB ? 'localhost' : this.questions.DbHost,
      dbPort: this.questions.defaultDB ? '27017' : this.questions.DbPort,
      dbName: this.questions.defaultDB ? this.questions.projectName : this.questions.DbName,
      jwtSecret: this.questions.secretKey,
    });

    this.fs.copyTpl(this.templatePath('README.md'), this.destinationPath(parentFolder + 'README.md'), {
      projectName: this.questions.projectName,
      pkm: this.questions.packageManager ? 'yarn' : 'npm run',
    });

    // This is noSQL specific
    this.fs.copyTpl(
      this.templatePath('userModel.ts'),
      this.destinationPath(parentFolder + 'src/models/userModel.ts')
    );

    this.fs.copyTpl(
      this.templatePath('dbHandler.ts'),
      this.destinationPath(parentFolder + 'tests/dbHandler.ts')
    );
    this.fs.copyTpl(
      this.templatePath('userResolver.test.ts'),
      this.destinationPath(parentFolder + 'tests/resolvers/userResolver.test.ts')
    );
  }

  install() {
    if (this.options.parentFolder) {
      var dir = process.cwd() + '/' + this.options.parentFolder;
      process.chdir(dir);
    }

    if (this.questions.packageManager === 'npm') {
      this.installDependencies({
        npm: true,
        yarn: false,
        bower: false,
      });
    }

    if (this.questions.packageManager === 'yarn') {
      this.installDependencies({
        yarn: true,
        npm: false,
        bower: false,
      });
    }
  }
};
