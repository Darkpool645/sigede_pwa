drop database if exists crud_db;
create database if exists crud_db;

use crud_db;

create table capturist(
    id bigint auto_increment primary key not null,
    name varchar(255) not null,
    email varchar(255) not null,
    password varchar(255) not null
);