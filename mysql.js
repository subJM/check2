const mysql = require('mysql2');
require('dotenv').config();

// MySQL 데이터베이스 연결 설정
// const createConnection = () => {
//     return mysql.createConnection({
//         host: process.env.HOST,
//         port: process.env.MYSQLPORT,
//         user: process.env.USERID,
//         password: process.env.PASSWORD,
//         database: process.env.DATABASE,
//         timezone : process.env.TIMEZONE,
//     });
// };

const pool = mysql.createPool({
    host: process.env.HOST,
    port: process.env.MYSQLPORT,
    user: process.env.USERID,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    timezone: process.env.TIMEZONE,
});

const loginDB = async (where, callback) => {
    pool.getConnection((err, connection) => {
        if (err) {
            callback(err, null);
            return;
        }
        const query = `SELECT * FROM users WHERE user_id = ? AND password = ?`;
        connection.query(query, [where.user_id, where.password], (error, results, fields) => {
            callback(error, results);
            connection.release(); // 연결 반환
        });
    });
};

const insertDB = async (table, setData, callback) => {
    pool.getConnection((err, connection) => {
        if (err) {
            callback(err, null);
            return;
        }

        const checkTableQuery = `SHOW TABLES LIKE '${table}'`;
        connection.query(checkTableQuery, (error, results, fields) => {
            if (error) {
                callback(error, null);
                connection.release(); // 연결 반환
                return;
            }
            
            if (results.length === 0) {
                const createTableQuery = `CREATE TABLE ${table} (
                    id int NOT NULL AUTO_INCREMENT,
                    token_name varchar(45) NOT NULL,
                    user_srl int NOT NULL,
                    user_id varchar(45) NOT NULL,
                    from_address varchar(100) NOT NULL,
                    to_address varchar(100) NOT NULL,
                    amount decimal(50,18) NOT NULL,
                    usedFee decimal(50,18) NOT NULL,
                    IsExternalTrade varchar(45) NOT NULL DEFAULT 'no',
                    transactionHash varchar(255) NOT NULL,
                    create_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id)
                  ) ENGINE=InnoDB;`;

                connection.query(createTableQuery, (createError, createResults, createFields) => {
                    if (createError) {
                        callback(createError, null);
                        connection.release();
                        return;
                    }

                    const insertQuery = `INSERT INTO ${table} SET ?`;
                    connection.query(insertQuery, setData, (insertError, insertResults, insertFields) => {
                        callback(insertError, insertResults);
                        connection.release();
                    });
                });
            } else {
                const insertQuery = `INSERT INTO ${table} SET ?`;
                connection.query(insertQuery, setData, (insertError, insertResults, insertFields) => {
                    console.log(setData);
                    callback(insertError, insertResults);
                    connection.release();
                });
            }
        });
    });
};

const selectHistoryDB = async (where, callback) => {
    const query = `SELECT a.user_id, username, email, wallet, address FROM users a 
                   JOIN walletinfo b ON a.id = b.user_srl  
                   WHERE user_id = ? AND password = ?`;
    pool.query(query, [where.user_id, where.password], (error, results) => {
        callback(error, results);
    });
};

const selectUserDB = async (table, where, callback) => {
    const query = `SELECT * FROM ${table} WHERE user_id = ?`;
    pool.query(query, [where.user_id], (error, results) => {
        callback(error, results);
    });
};

const insertContractDB = async (table, contract_info, callback) => {
    const query = `INSERT INTO ${table} SET ?`;
    pool.query(query, contract_info, (error, results) => {
        callback(error, results);
    });
};

const DB_query = async (query, token_info, callback) => {
    pool.query(query, token_info, (error, results) => {
        callback(error, results[0]);
    });
};

const findTokenContractAddress = async (token_info, callback) => {
    const query = `SELECT * FROM globalmeta.contract WHERE ?`;
    pool.query(query, token_info, (error, results) => {
        callback(error, results[0]);
    });
};

const getTokenList = async (user_srl, callback) => {
    const query = `SELECT Id, wallet, token_name FROM globalmeta.walletinfo WHERE user_srl = ?`;
    pool.query(query, [user_srl], (error, results) => {
        callback(error, results);
    });
};

const getWalletBalance = async (user_srl, callback) => {
    const query = `SELECT * FROM globalmeta.walletinfo WHERE user_srl = ?`;
    pool.query(query, [user_srl], (error, results) => {
        callback(error, results);
    });
};

const checkAddress = async (checkForm, callback) => {
    const query = `SELECT * FROM globalmeta.walletinfo WHERE token_name = ? AND address = ?`;
    const queryParams = [checkForm.token_name, checkForm.to_address];
    pool.query(query, queryParams, (error, results) => {
        callback(error, results);
    });
};

const updateWalletInfo = async (sign, user_srl, token_name, amount, callback) => {
    const type = sign === "plus" ? "+" : "-";
    const query = `UPDATE globalmeta.walletinfo 
                   SET balance = balance ${type} ? 
                   WHERE user_srl = ? AND token_name = ?`;
    pool.query(query, [amount, user_srl, token_name], (error, results) => {
        callback(error, results);
    });
};

const updateWallet = (user_srl, token_name, balance, callback) => {
    const query = `UPDATE globalmeta.walletinfo 
                   SET balance = ? 
                   WHERE user_srl = ? AND token_name = ?`;
    pool.query(query, [balance, user_srl, token_name], (error, results) => {
        callback(error, results);
    });
};

const getHistory = (user_srl, token_name, address, callback) => {
    const query = `SELECT *,
                   CASE 
                       WHEN to_address = ? THEN 'receive'
                       ELSE 'send'
                   END AS action
                   FROM globalmeta.${token_name}_history
                   WHERE token_name = ? AND (from_address = ? OR to_address = ?)
                   ORDER BY create_at DESC`;
    pool.query(query, [address, token_name, address, address], (error, results) => {
        callback(error, results);
    });
};

const sendQuestion = (setData, callback) => {
    const insertQuery = `INSERT INTO globalmeta.suggestions SET ?`;
    pool.query(insertQuery, setData, (error, results) => {
        callback(error, results);
    });
};

const getNotice = (callback) => {
    const query = `SELECT * FROM globalmeta.notice`;
    pool.query(query, (error, results) => {
        callback(error, results);
    });
};

const searchNotice = (searchData, callback) => {
    const query = `SELECT * FROM globalmeta.notice 
                   WHERE title LIKE ? OR content LIKE ?`;
    const queryParams = [`%${searchData}%`, `%${searchData}%`];
    pool.query(query, queryParams, (error, results) => {
        callback(error, results);
    });
};

const getNoticeDetail = (noticeId, callback) => {
    const query = `SELECT * FROM globalmeta.notice WHERE id = ?`;
    pool.query(query, [noticeId], (error, results) => {
        callback(error, results);
    });
};

// 모듈로 내보내기
module.exports = {
    insertDB,
    selectUserDB,
    insertContractDB,
    findTokenContractAddress,
    selectHistoryDB,
    loginDB,
    getTokenList,
    getWalletBalance,
    checkAddress,
    updateWalletInfo,
    updateWallet,
    getHistory,
    sendQuestion,
    getNotice,
    searchNotice,
    getNoticeDetail,
};