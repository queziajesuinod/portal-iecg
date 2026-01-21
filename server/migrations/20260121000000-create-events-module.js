'use strict';

const schema = process.env.DB_SCHEMA || 'dev_iecg';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${schema};`);
    
    // Create Events table
    await queryInterface.createTable(
      {
        tableName: 'Events',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        title: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        startDate: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        endDate: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        location: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        imageUrl: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        maxRegistrations: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        currentRegistrations: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        createdBy: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Users', schema },
            key: 'id'
          }
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
      }
    );

    // Create EventBatches table
    await queryInterface.createTable(
      {
        tableName: 'EventBatches',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        eventId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Events', schema },
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        price: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        maxQuantity: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        currentQuantity: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        startDate: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        endDate: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        order: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
      }
    );

    // Create Coupons table
    await queryInterface.createTable(
      {
        tableName: 'Coupons',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        eventId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Events', schema },
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
        },
        discountType: {
          type: Sequelize.ENUM('percentage', 'fixed'),
          allowNull: false,
        },
        discountValue: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        maxUses: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        currentUses: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
        },
        validFrom: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        validUntil: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
      }
    );

    // Create FormFields table
    await queryInterface.createTable(
      {
        tableName: 'FormFields',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        eventId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Events', schema },
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        fieldType: {
          type: Sequelize.ENUM(
            'text',
            'email',
            'phone',
            'number',
            'textarea',
            'select',
            'checkbox',
            'radio',
            'date',
            'cpf',
            'file'
          ),
          allowNull: false,
        },
        fieldLabel: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        fieldName: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        placeholder: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        isRequired: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        options: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        order: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        section: {
          type: Sequelize.ENUM('buyer', 'attendee'),
          allowNull: false,
          defaultValue: 'attendee',
        },
        validationRules: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
      }
    );

    // Create Registrations table
    await queryInterface.createTable(
      {
        tableName: 'Registrations',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        orderCode: {
          type: Sequelize.STRING(20),
          allowNull: false,
          unique: true,
        },
        eventId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Events', schema },
            key: 'id'
          }
        },
        batchId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'EventBatches', schema },
            key: 'id'
          }
        },
        couponId: {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'Coupons', schema },
            key: 'id'
          }
        },
        quantity: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        },
        buyerData: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        originalPrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        discountAmount: {
          type: Sequelize.DECIMAL(10, 2),
          defaultValue: 0,
        },
        finalPrice: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
        },
        paymentStatus: {
          type: Sequelize.ENUM(
            'pending',
            'authorized',
            'confirmed',
            'denied',
            'cancelled',
            'refunded'
          ),
          defaultValue: 'pending',
        },
        paymentId: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        paymentMethod: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        cieloResponse: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
      }
    );

    // Create RegistrationAttendees table
    await queryInterface.createTable(
      {
        tableName: 'RegistrationAttendees',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        registrationId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Registrations', schema },
            key: 'id'
          },
          onDelete: 'CASCADE'
        },
        attendeeData: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        attendeeNumber: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
      }
    );

    // Create PaymentTransactions table
    await queryInterface.createTable(
      {
        tableName: 'PaymentTransactions',
        schema,
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        registrationId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { tableName: 'Registrations', schema },
            key: 'id'
          }
        },
        transactionType: {
          type: Sequelize.ENUM(
            'authorization',
            'capture',
            'cancellation',
            'refund',
            'webhook'
          ),
          allowNull: false,
        },
        status: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        cieloPaymentId: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        amount: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
        },
        responseData: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        errorMessage: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.NOW,
        },
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable({ tableName: 'PaymentTransactions', schema });
    await queryInterface.dropTable({ tableName: 'RegistrationAttendees', schema });
    await queryInterface.dropTable({ tableName: 'Registrations', schema });
    await queryInterface.dropTable({ tableName: 'FormFields', schema });
    await queryInterface.dropTable({ tableName: 'Coupons', schema });
    await queryInterface.dropTable({ tableName: 'EventBatches', schema });
    await queryInterface.dropTable({ tableName: 'Events', schema });
  },
};
