import {MongoClient, Db, ObjectId} from 'mongodb'

let conn: MongoClient
let db: Db

async function connect() {
    try {
        if (!process.env['MONGO_CONNECT_STRING']) throw new Error('Environment variable MONGO_CONNECT_STRING is not set')
        if (!process.env['DB_NAME']) throw new Error('Environment variable DB_NAME is not set')
        conn = await MongoClient.connect(process.env['MONGO_CONNECT_STRING'], {useUnifiedTopology: true})
        db = conn.db(process.env['DB_NAME'])
    }
    catch(err) {
        console.error(err)
        process.exit(1)
    }
}

export async function findOne(collection: string, query: any, options?: any): Promise<any> {
    if (!conn) await connect()
    return db.collection(collection).findOne(query, options)
}

export async function find(collection: string, query: any, options?: any): Promise<any[]> {
    if (!conn) await connect()
    return db.collection(collection).find(query, options).toArray()
}

export async function findOneAndUpdate(collection: string, query: any, newDoc: any, options?: any): Promise<any> {
    if (!conn) await connect()
    return db.collection(collection).findOneAndUpdate(query, newDoc, options)
}

export async function insertOne(collection: string, doc: any): Promise<any> {
    if (!conn) await connect()
    return db.collection(collection).insertOne(doc)  
}

export async function updateOne(collection: string, query: any, newDoc: any, options?: any): Promise<any> {
    if (!conn) await connect()
    return db.collection(collection).updateOne(query, newDoc, options)
}
  
export async function updateMany(collection: string, query: any, newDoc: any, options?: any): Promise<any> {
    if (!conn) await connect()
    return db.collection(collection).updateMany(query, newDoc, options)
}

export async function deleteMany(collection: string, filter: any): Promise<any> {
    if (!conn) await connect()
    return db.collection(collection).deleteMany(filter)
}

export async function distinct(collection: string, field: string, query?: any, options?: any): Promise<any> {
    if (!conn) await connect()
    return db.collection(collection).distinct(field, query, options)
}

export async function aggregate(collection: string, pipeline: any, options?: any): Promise<any> {
    if (!conn) await connect()
    return db.collection(collection).aggregate(pipeline, options).toArray()
}

export async function createUniqueIndex(collection: string, fieldName: string): Promise<any> {
    if (!conn) await connect()
    const spec = {}
    spec[fieldName] = 1
    return db.collection(collection).createIndex(spec, {unique: true})
}

export { ObjectId }
