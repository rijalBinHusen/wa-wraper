import { google } from 'googleapis';
import credentials from "../../config-google.json";
import fs from "fs"

interface ResultFunction {
    isSuccess: boolean
    message: string
    id: string
}

export class Spreadsheet {
    client;
    sheets;
    drive;
    constructor() {
        this.client = new google.auth.JWT({
            email: credentials.client_email,
            key: credentials.private_key,
            scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'] // Scopes for Drive and Sheets APIs
        });
        this.sheets = google.sheets({ version: 'v4', auth: this.client });
        this.drive = google.drive({ version: 'v3', auth: this.client });
    }

    async createAndMoveToFolder( spreadsheetName: string, folderId: string): Promise<ResultFunction> {
        try {
    
            const spreadsheet = await this.sheets.spreadsheets.create({ 
                requestBody: {
                    properties: {
                        title: spreadsheetName
                    }
                }
             })
    
            const spreadsheetId = spreadsheet.data.spreadsheetId;

            await this.moveFileToFolder(spreadsheetId || "", folderId);
    
            return {
                isSuccess: true,
                message: `Spreadsheet created and moved to folder ${folderId} successfully.`,
                id: spreadsheetId + ""
            };
        } catch (err) {

            return { 
                isSuccess: false,
                message: `Error creating and moving spreadsheet: ${err}`,
                id: ""
            }
        }
    }

    async moveFileToFolder(fileId:string, folderId: string): Promise<ResultFunction> {
        try {
            if(fileId == "" || folderId == "") throw "Failed to move google drive, File ID or Folder ID is empty";
            // Move the newly created spreadsheet file to the specified folder
            const result = await this.drive.files.update({
                fileId: fileId || "",
                addParents: folderId,
                removeParents: 'root'
            });

            return {
                isSuccess: true,
                message: `File moved to folder ${folderId} successfully.`,
                id: result.data.id || ""
            }
        }

        catch (err) {

            return {
                isSuccess: true,
                message: `Failed to moved to folder ${folderId}.`,
                id: ""
            }
        }
    }

    async copySpreadsheetToFolder(spreadsheetId: string, folderId: string, newFileName: string): Promise<ResultFunction> {
            
        try {
    
            // Copy the spreadsheet
            const copiedFile = await this.drive.files.copy({
                fileId: spreadsheetId,
                requestBody: {
                    name: newFileName || 'Created from nodejs'
                }
            });
    
            // Move the copied spreadsheet to the target folder
            await this.moveFileToFolder(copiedFile.data.id || "", folderId);
    
            return {
                isSuccess: true,
                id: copiedFile.data.id || "",
                message: `Spreadsheet copied and moved to folder ${folderId} successfully.`
            };
        } catch (error) {
            return {
                isSuccess: true,
                id: "",
                message: `Spreadsheet copied and moved to folder ${folderId} successfully.`
            };
        }
    }

    async insertDataToSheet(spreadsheetId: string, range: string, data: any[]): Promise<ResultFunction> {
            // Prepare data for appending (may require formatting)
        const values = data.map(obj => Object.values(obj)); // Assuming consistent object properties
    
        try {
            const isParameterInvalid = !spreadsheetId || !range || !data;
            if (isParameterInvalid) throw `Parameter insert data to sheet invalid`;
            const resource = { values: values };
    
            const request = {
                spreadsheetId: spreadsheetId,
                range: range,
                valueInputOption: 'RAW',
                resource: resource
            };
            const result = await this.sheets.spreadsheets.values.append(request);
    
            return {
                isSuccess: true,
                id: "",
                message: `${result.data.updates?.updatedCells} cells updated.`
            }
        } catch (err) {
            return {
                isSuccess: false,
                id: "",
                message: `Error inserting data: ${err}`
            }
        }
    }

    async sortDataSpreadsheet(spreadsheetId: string, columnsIndex: number[], startRow: number, startColumnIndex: number, endColumnIndex: number): Promise<ResultFunction> {

        const response = await this.sheets.spreadsheets.get({ spreadsheetId });
        const isFailedToGetSheet = !response.data || !response.data.sheets?.length || !response.data.sheets[0].properties || !response.data.sheets[0].properties.sheetId;
        if(isFailedToGetSheet) return {
            id: "",
            isSuccess: false,
            message: "Failed to access google spreadsheet"
        };
        
        // @ts-ignore
        const sheetId = response.data.sheets[0].properties.sheetId;
    
        const sortSpecs = [];
        for(let col of columnsIndex) {
            sortSpecs.push({ dimensionIndex: col, sortOrder: 'ASCENDING' })
        }
    
        try {
            const request = {
                spreadsheetId,
                resource: {
                    requests: [
                        {
                            sortRange: {
                                range: {
                                    sheetId, // sheet index (0-based)
                                    startRowIndex: startRow || 1, // start row index (0-based),
                                    endRowIndex: null,
                                    startColumnIndex,
                                    endColumnIndex,
                                },
                                sortSpecs,
                            },
                        },
                    ],
                },
            };
    
            // Execute the request
            await this.sheets.spreadsheets.batchUpdate(request);
            return {
                id: "",
                isSuccess: true,
                message:'Data sorted successfully.'
            }
        } catch (err) {
            
            return {
                id: "",
                isSuccess: true,
                message: `The API returned an error: ${err}`
            }
        }
    }
    
    async getColumnsValue(spreadsheetId: string, range: string): Promise<string|any[][]> {

            try {
                const response = await this.sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range,
                });
                // check is reponse.data.values not null and not undefined
                if (response.data.values?.length) return response.data.values;
                
                throw "There is no value in the range";
            } catch (err) {
                return 'The API returned an error:' + err;
            }
        }
    
    async createAndUploadJsonFile(folderId: string, fileName: string, jsonData: string): Promise<string|false> {
        
        try {
            // Create a temporary JSON file
            const tempFilePath = './temp.json';
            fs.writeFileSync(tempFilePath, jsonData);
        
            // Upload the JSON file to Google Drive
            const fileMetadata = {
                name: fileName,
                parents: [folderId],
            };
        
            const res = await this.drive.files.create({
            requestBody: fileMetadata,
            media: {
                mimeType: 'application/json',
                body: fs.createReadStream(tempFilePath),
            },
            
            });
        
            // Clean up: Delete the temporary file
            fs.unlinkSync(tempFilePath);
            return 'Json file success uploaded with ID:' + res.data.id;
        
        } catch (error) {
            console.error('Error uploading JSON file:', error);
            return false;
        }
    }

    async copyRangeToRange(spreadsheetId: string, sourceRange: string, targetRange: string): Promise<ResultFunction> {
        // sourceRange = "Sheet1!A2:C10"
        try {
            const sourceIndexes = await this.getRangeIndexes(spreadsheetId, sourceRange);
            const targetIndexes = await this.getRangeIndexes(spreadsheetId, targetRange);
            const request = {
                spreadsheetId: spreadsheetId,
                resource: {
                requests: [
                    {
                    copyPaste: {
                        source: sourceIndexes,
                        destination: targetIndexes,
                        pasteType: 'PASTE_NORMAL' // Copy everything (values, formulas, formatting)
                    }
                    }
                ]
                }
          };
      
          await this.sheets.spreadsheets.batchUpdate(request);
        //   console.log(JSON.stringify(sourceIndexes))
        //   console.log(JSON.stringify(targetIndexes))
          return {
                id: "",
                isSuccess: true,
                message:`Data from ${sourceRange} to ${targetRange} copied successfully!`
            }
        } catch (err) {
            return {
                id: "",
                isSuccess: true,
                message:'Error copying data from range to range:' + err
            }
        }
      }
    
    private async getRangeIndexes(spreadsheetId: string, range: string) {
        const response = await this.sheets.spreadsheets.get({
          spreadsheetId,
          fields: 'sheets.properties',
        });

        if(!response || !response.data || !response.data.sheets || !response.data.sheets[0].properties || !response.data.sheets[0].properties.title) {

            throw new Error(`Can not access spreadsheet to get range index`);
        }
      
        const splitRange = range.split('!');
        const sheetName = splitRange[0]; // Extract sheet name
        // @ts-ignore
        const sheet = response.data.sheets.find(s => s.properties.title === sheetName);
        
        if (!sheet || !sheet.properties || !sheet.properties.sheetId) {
          throw new Error(`Sheet "${sheetName}" not found`);
        }
      
        const sheetId = sheet.properties.sheetId;
      
        // // Convert A1 notation to indexes using the Google Sheets API
        // const response2 = await this.sheets.spreadsheets.values.get({
        //   spreadsheetId,
        //   range,
        // });
      
        const startRowIndex = parseInt(splitRange[1].match(/\d+/g)?.[0] ?? '1', 10) - 1; // Extract first number for row index
        const endRowIndex = parseInt(splitRange[1].match(/\d+/g)?.[1] ?? '1', 10) - 1; // Extract first number for row index
        // const endRowIndex = startRowIndex + rows.length;
      
        const startColumnLetter = splitRange[1].match(/[A-Z]+/g)?.[0] ?? 'A'; // Extract first column letter
        const endColumnLetter = splitRange[1].match(/[A-Z]+/g)?.[1] ?? startColumnLetter; // Extract second column letter
      
        const startColumnIndex = this.letterToNumber(startColumnLetter);
        const endColumnIndex = this.letterToNumber(endColumnLetter); // End index is exclusive
      
        return { sheetId, startRowIndex, endRowIndex, startColumnIndex, endColumnIndex };
      }

    private letterToNumber(letter: string) {
        const charCode = letter.toUpperCase().charCodeAt(0); // Get ASCII code of uppercase letter
        const aCharCode = 'A'.charCodeAt(0); // ASCII code of 'A'
        
        // Check if it's a valid letter (A-Z)
        if (charCode < aCharCode || charCode > aCharCode + 25) {
            return null; // Or throw an error: throw new Error("Invalid input: Not a letter A-Z");
        }
        
        return charCode - aCharCode; // Calculate the number (A=0, B=1, ... Z=25)
    }

    async getLastRow(spreadsheetId: string, sheetName: string, column: string) {
      
        try {
          const response = await this.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${sheetName}!${column}:${column}`, // Check column A for data
            valueRenderOption: 'FORMULA', // To handle formula cells correctly
            majorDimension: 'ROWS', // To get data as rows
          });
      
          const values = response.data.values;
      
          if (!values || values.length === 0) {
            return 0; // Sheet is empty
          }
      
          // Find the last row with data
          let lastRow = values.length;
          while (lastRow > 0 && (values[lastRow - 1] === undefined || values[lastRow - 1].length === 0 || values[lastRow - 1][0] === '')) {
            lastRow--;
          }
      
          return lastRow;
      
        } catch (error) {
          console.error('Error getting last row:', error);
          return 0; // Return 0 in case of error
        }
      }

    async setValueToRange(spreadsheetId: string, sheetName: string, range: string, value: string): Promise<ResultFunction>  {
    
        try {
            const request = {
            spreadsheetId: spreadsheetId,
            range: `${sheetName}!${range}`,
            valueInputOption: 'USER_ENTERED', // or 'RAW'
            resource: {
                values: [[value]], // The value to set (as a 2D array)
                },
            };
        
            const response = await this.sheets.spreadsheets.values.update(request);
            return {
                id: "",
                isSuccess: true,
                message: "Value set successfully",
            }
        
        } catch (error) {
            return {
                id: "",
                isSuccess: false,
                message: "Error setting value: " + JSON.stringify(error),
            }
        }
    }

    async setValuesToRange(spreadsheetId: string, sheetName: string, range: string, values: (string | number)[][]): Promise<ResultFunction>  {
    
        try {
            const request = {
                spreadsheetId: spreadsheetId,
                range: `${sheetName}!${range}`,
                valueInputOption: 'USER_ENTERED', // or 'RAW'
                resource: { values } // The value to set (as a 2D array)
            };
        
            const response = await this.sheets.spreadsheets.values.update(request);
            return {
                id: "",
                isSuccess: true,
                message: "Value set successfully",
            }
        
        } catch (error) {
            return {
                id: "",
                isSuccess: false,
                message: "Error setting value: " + JSON.stringify(error),
            }
        }
    }
}