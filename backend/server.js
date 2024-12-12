const express = require('express');
const mysql = require('mysql2');
const cyrpto = require('crypto');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'crud_db'
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'sigedecontacto@gmail.com',
        pass: 'kalo bobb ufld rdaz'
    }
});

function generatePassword() {
    return cyrpto.randomBytes(6).toString('hex');
}

app.post('/capturists', (req, res) => {
    const { name, email } = req.body;
    const password = generatePassword();

    const query = 'INSERT INTO capturists (name, email, password) VALUES (?, ?, ?)';
    db.query(query, [name, email, password], (err, results) => {
        if(err) {
            if (err.code === 'ER_DUP+ENTRY') {
                return res.status(400).json({ error: 'Correo ya registrado' });
            }
            return res.status(500).json({ error: err.message });
        }

        const mailOptions = {
            from: 'sigedecontacto@gmail.com',
            to: email,
            subject: 'Contraseña temporal',
            text: `Tu contraseña temporal es ${password}`
        };

        transporter.sendMail(mailOptions, (emailErr) => {
            if (emailErr) return res.status(500).json({ error: 'No se pudo enviar el correo. Intetalo mas tarde'});

            res.status(201).json({ message: 'Capturista creado exitosamente'});
        });
    });
});

app.get('/capturists', (req, res) => {
    const query = 'SELECT id, name, email FROM capturists';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/capturists/:id', (req, res) => {
    const id = req.params.id;
    const query = 'SELECT id, name, email FROM capturists WHERE id = ?';
    db.query(query, id, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: 'No se encontró el capturista'});
        res.json(results[0]);
    });
});

app.put('/capturists/:id', (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    const query = 'UPDATE capturists SET name = ? WHERE id = ?';
    db.query(query, [name, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.affectedRows === 0){
            return res.status(404).json({ error: 'No se encontro el capturista'});
        }
        res.json({ message: 'Capturista actualizado exixtosamente'});
    });
});

app.delete('/capturists/:id', (req, res) => {
    const { id } = req.params;

    const query = 'DELETE FROM capturists WHERE id = ?';
    db.query(query, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.affectedRows === 0){
            return res.status(404).json({ error: 'No se encontró al capturista' });
        }
        res.json({ message: 'Capturista elminado exitosamente' });
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en la URL http://localhost:${PORT}`));